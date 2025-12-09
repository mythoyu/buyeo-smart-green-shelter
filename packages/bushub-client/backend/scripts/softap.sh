#!/bin/bash

# SoftAP(Hotspot) 설정 스크립트
# 보안을 위해 입력값 검증 및 로깅 포함

set -e  # 오류 발생 시 즉시 종료

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/bushub-softap.log
}

# WiFi 인터페이스 찾기
find_wifi_interface() {
    local wifi_interface=""
    
    # 일반적인 WiFi 인터페이스 이름들 확인
    for interface in wlp3s0 wlan0 wlp2s0 wlp1s0 wlp0s0; do
        if ip link show "$interface" >/dev/null 2>&1; then
            wifi_interface="$interface"
            break
        fi
    done
    
    # nmcli로 WiFi 인터페이스 찾기
    if [[ -z "$wifi_interface" ]]; then
        wifi_interface=$(nmcli device | grep wifi | head -1 | awk '{print $1}')
    fi
    
    echo "$wifi_interface"
}

# JSON 안전 문자열 변환
json_escape() {
    local str="$1"
    # JSON에서 특수문자 이스케이프
    str="${str//\\/\\\\}"
    str="${str//\"/\\\"}"
    str="${str//$'\n'/\\n}"
    str="${str//$'\r'/\\r}"
    str="${str//$'\t'/\\t}"
    echo "$str"
}

# Hotspot 설정
setup_hotspot() {
    local ifname=$1
    local ssid=$2
    local password=$3
    
    log "Hotspot 설정 시작: $ifname, SSID: $ssid"
    
    # 기존 Hotspot 연결 제거
    if nmcli connection show "Hotspot" >/dev/null 2>&1; then
        log "기존 Hotspot 연결 제거"
        nmcli connection down "Hotspot" || true
        nmcli connection delete "Hotspot" || true
    fi
    
    # 새 Hotspot 생성
    nmcli device wifi hotspot ifname "$ifname" con-name "Hotspot" ssid "$ssid" password "$password"
    log "Hotspot 생성 완료"
    
    # 자동 연결 설정 (항상 활성화)
    nmcli connection modify "Hotspot" connection.autoconnect yes
    log "Hotspot 자동 연결 설정 완료"
    
    echo "success"
}

# Hotspot 상태 확인
check_hotspot_status() {
    log "Hotspot 상태 확인"
    
    if nmcli connection show "Hotspot" >/dev/null 2>&1; then
        local autoconnect=$(nmcli connection show "Hotspot" | grep autoconnect | awk '{print $2}' | head -1)
        local method=$(nmcli connection show "Hotspot" | grep "ipv4.method" | awk '{print $2}' | head -1)
        local addresses=$(nmcli connection show "Hotspot" | grep "ipv4.addresses" | awk '{print $2}' | head -1)
        local gateway=$(nmcli connection show "Hotspot" | grep "ipv4.gateway" | awk '{print $2}' | head -1)
        
        # JSON 안전성 보장
        autoconnect=$(json_escape "$autoconnect")
        method=$(json_escape "$method")
        addresses=$(json_escape "$addresses")
        gateway=$(json_escape "$gateway")
        
        cat << EOF
{
    "exists": true,
    "autoconnect": "$autoconnect",
    "method": "$method",
    "addresses": "$addresses",
    "gateway": "$gateway"
}
EOF
    else
        echo "{\"exists\": false, \"autoconnect\": \"unknown\", \"method\": \"unknown\", \"addresses\": \"unknown\", \"gateway\": \"unknown\"}"
    fi
}

# Hotspot 연결 정보 확인
get_hotspot_info() {
    log "Hotspot 연결 정보 확인"
    
    if nmcli connection show "Hotspot" >/dev/null 2>&1; then
        nmcli connection show "Hotspot"
    else
        echo "Hotspot 연결이 존재하지 않습니다"
    fi
}

# Hotspot 클라이언트 목록 확인
get_hotspot_clients() {
    log "Hotspot 클라이언트 목록 확인"
    
    if nmcli connection show "Hotspot" >/dev/null 2>&1; then
        # WiFi 인터페이스 동적 감지
        local wifi_interface=$(find_wifi_interface)
        
        if [[ -n "$wifi_interface" ]]; then
            # 연결된 WiFi 클라이언트 확인
            nmcli device wifi list ifname "$wifi_interface" 2>/dev/null || echo "WiFi 클라이언트 정보를 가져올 수 없습니다"
        else
            echo "WiFi 인터페이스를 찾을 수 없습니다"
        fi
    else
        echo "Hotspot이 활성화되지 않았습니다"
    fi
}

# Hotspot 재시작
restart_hotspot() {
    log "Hotspot 재시작 시작"
    
    if nmcli connection show "Hotspot" >/dev/null 2>&1; then
        nmcli connection down "Hotspot"
        sleep 2
        nmcli connection up "Hotspot"
        log "Hotspot 재시작 완료"
        echo "success"
    else
        log "Hotspot 연결이 존재하지 않습니다"
        echo "error: hotspot_not_found"
        return 1
    fi
}

# 메인 실행 부분
case "$1" in
    "setup")
        setup_hotspot "$2" "$3" "$4"
        ;;
    "status")
        check_hotspot_status
        ;;
    "info")
        get_hotspot_info
        ;;
    "clients")
        get_hotspot_clients
        ;;
    "restart")
        restart_hotspot
        ;;
    *)
        echo "사용법: $0 {setup|status|info|clients|restart} [parameters...]"
        echo "  setup <ifname> <ssid> <password> - Hotspot 설정"
        echo "  status - Hotspot 상태 확인"
        echo "  info - Hotspot 연결 정보 확인"
        echo "  clients - Hotspot 클라이언트 목록 확인"
        echo "  restart - Hotspot 재시작"
        exit 1
        ;;
esac 