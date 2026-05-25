#!/bin/bash

# NTP 설정 스크립트
# 보안을 위해 입력값 검증 및 로깅 포함

set -e

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/bushub-ntp.log
}

json_escape() {
    local str="$1"
    str="${str//\\/\\\\}"
    str="${str//\"/\\\"}"
    str="${str//$'\n'/\\n}"
    str="${str//$'\r'/\\r}"
    str="${str//$'\t'/\\t}"
    echo "$str"
}

validate_ip() {
    local ip=$1
    if [[ ! $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        return 1
    fi
    IFS='.' read -r -a octets <<< "$ip"
    for octet in "${octets[@]}"; do
        if [[ $octet -lt 0 || $octet -gt 255 ]]; then
            return 1
        fi
    done
    return 0
}

backup_ntp_config() {
    local config_file="/etc/systemd/timesyncd.conf"
    local backup_dir="/var/backups/bushub/ntp"
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="${backup_dir}/timesyncd.conf.bak_${timestamp}"

    log "NTP 설정 백업 시작"
    mkdir -p "$backup_dir"

    if [[ -f "$config_file" ]]; then
        cp "$config_file" "$backup_file"
        log "NTP 설정 백업 완료: $backup_file"
        echo "$backup_file"
    else
        log "경고: NTP 설정 파일이 존재하지 않습니다: $config_file"
        echo "no_file"
    fi
}

set_ntp_server() {
    local ntp_server=$1
    local config_file="/etc/systemd/timesyncd.conf"

    log "NTP 서버 설정 시작: $ntp_server"

    if ! validate_ip "$ntp_server"; then
        log "오류: 유효하지 않은 NTP 서버 IP 주소: $ntp_server"
        echo "error: invalid_ntp_server"
        return 1
    fi

    backup_ntp_config

    if [[ ! -f "$config_file" ]]; then
        log "NTP 설정 파일 생성"
        touch "$config_file"
    fi

    if grep -q "^\\s*NTP=" "$config_file"; then
        sed -i "s/^\\s*NTP=.*/NTP=$ntp_server/" "$config_file"
        log "기존 NTP 서버를 '$ntp_server'로 업데이트"
    else
        if grep -q "\\[Time\\]" "$config_file"; then
            sed -i "/\\[Time\\]/a NTP=$ntp_server" "$config_file"
            log "[Time] 섹션 아래에 NTP 서버 '$ntp_server' 추가"
        else
            echo -e "\\n[Time]\\nNTP=$ntp_server" >> "$config_file"
            log "새로운 [Time] 섹션과 NTP 서버 '$ntp_server' 추가"
        fi
    fi

    if grep -q "^\\s*FallbackNTP=" "$config_file"; then
        sed -i "s/^\\s*FallbackNTP=/#FallbackNTP=/" "$config_file"
        log "FallbackNTP 주석 처리 완료"
    fi

    log "systemd-timesyncd 서비스 재시작"
    systemctl restart systemd-timesyncd
    sleep 5

    log "NTP 설정 완료"
    echo "success"
}

check_ntp_status() {
    log "NTP 상태 확인"

    local service_status=$(systemctl is-active systemd-timesyncd 2>/dev/null || echo "unknown")
    local service_enabled=$(systemctl is-enabled systemd-timesyncd 2>/dev/null || echo "unknown")
    local sync_status=$(timedatectl status 2>/dev/null | grep -E "NTP synchronized|System clock synchronized" | head -1 | awk '{print $3}' || echo "unknown")
    local current_ntp=$(timedatectl status 2>/dev/null | grep "NTP server" | head -1 | awk '{print $3}' || echo "unknown")
    local config_ntp="unknown"
    if [[ -f "/etc/systemd/timesyncd.conf" ]]; then
        config_ntp=$(grep "^\\s*NTP=" "/etc/systemd/timesyncd.conf" | head -1 | sed 's/^[[:space:]]*NTP=//' || echo "unknown")
    fi

    service_status=$(json_escape "$service_status")
    service_enabled=$(json_escape "$service_enabled")
    sync_status=$(json_escape "$sync_status")
    current_ntp=$(json_escape "$current_ntp")
    config_ntp=$(json_escape "$config_ntp")

    cat << EOF
{
    "service_status": "$service_status",
    "service_enabled": "$service_enabled",
    "sync_status": "$sync_status",
    "current_ntp_server": "$current_ntp",
    "config_ntp_server": "$config_ntp"
}
EOF
}

show_ntp_config() {
    local config_file="/etc/systemd/timesyncd.conf"
    log "NTP 설정 파일 내용 확인"
    if [[ -f "$config_file" ]]; then
        cat "$config_file"
    else
        echo "NTP 설정 파일이 존재하지 않습니다: $config_file"
    fi
}

list_ntp_backups() {
    local backup_dir="/var/backups/bushub/ntp"
    log "NTP 백업 파일 목록 확인"
    if [[ -d "$backup_dir" ]]; then
        ls -la "$backup_dir"/*.bak_* 2>/dev/null || echo "백업 파일이 없습니다."
    else
        echo "백업 디렉토리가 존재하지 않습니다: $backup_dir"
    fi
}

restore_ntp_config() {
    local backup_file=$1
    log "NTP 설정 복원 시작: $backup_file"
    if [[ ! -f "$backup_file" ]]; then
        log "오류: 백업 파일이 존재하지 않습니다: $backup_file"
        echo "error: backup_file_not_found"
        return 1
    fi
    backup_ntp_config
    cp "$backup_file" "/etc/systemd/timesyncd.conf"
    log "NTP 설정 복원 완료"
    systemctl restart systemd-timesyncd
    log "systemd-timesyncd 서비스 재시작"
    echo "success"
}

case "$1" in
    "set_server")
        set_ntp_server "$2"
        ;;
    "backup")
        backup_ntp_config
        ;;
    "status")
        check_ntp_status
        ;;
    "show_config")
        show_ntp_config
        ;;
    "list_backups")
        list_ntp_backups
        ;;
    "restore")
        restore_ntp_config "$2"
        ;;
    *)
        echo "사용법: $0 {set_server|backup|status|show_config|list_backups|restore} [parameters...]"
        exit 1
        ;;
esac
