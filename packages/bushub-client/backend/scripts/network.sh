#!/bin/bash

# 네트워크 설정 스크립트
# 보안을 위해 입력값 검증 및 로깅 포함

set -e  # 오류 발생 시 즉시 종료

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/bushub-network.log
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

# 입력값 검증 함수
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

validate_cidr() {
    local cidr=$1
    if [[ ! $cidr =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
        return 1
    fi
    local prefix=${cidr#*/}
    if [[ $prefix -lt 1 || $prefix -gt 32 ]]; then
        return 1
    fi
    return 0
}

# DHCP 설정
setup_dhcp() {
    local ifname=$1
    local con_name=$2
    
    log "DHCP 설정 시작: $ifname, 연결명: $con_name"
    
    # 기존 연결 제거
    if nmcli connection show "$con_name" >/dev/null 2>&1; then
        log "기존 연결 제거: $con_name"
        nmcli connection down "$con_name" || true
        nmcli connection delete "$con_name" || true
    fi
    
    # 새 연결 생성 (DHCP)
    nmcli connection add type ethernet con-name "$con_name" ifname "$ifname"
    nmcli connection modify "$con_name" ipv4.method auto
    nmcli connection modify "$con_name" ipv6.method auto
    
    # 연결 활성화
    nmcli connection up "$con_name"
    log "DHCP 설정 완료"
    
    echo "success"
}

# Static IP 설정
setup_static_ip() {
    local ifname=$1
    local con_name=$2
    local ip_address=$3
    local gateway=$4
    local dns=$5
    
    log "Static IP 설정 시작: $ifname, IP: $ip_address, Gateway: $gateway"
    
    # 입력값 검증
    if ! validate_cidr "$ip_address"; then
        log "오류: 유효하지 않은 IP 주소 형식: $ip_address"
        echo "error: invalid_ip_format"
        return 1
    fi
    
    if ! validate_ip "$gateway"; then
        log "오류: 유효하지 않은 게이트웨이 주소: $gateway"
        echo "error: invalid_gateway"
        return 1
    fi
    
    # DNS 검증
    IFS=' ' read -r -a dns_servers <<< "$dns"
    for dns_server in "${dns_servers[@]}"; do
        if ! validate_ip "$dns_server"; then
            log "오류: 유효하지 않은 DNS 서버 주소: $dns_server"
            echo "error: invalid_dns"
            return 1
        fi
    done
    
    # 기존 연결 제거
    if nmcli connection show "$con_name" >/dev/null 2>&1; then
        log "기존 연결 제거: $con_name"
        nmcli connection down "$con_name" || true
        nmcli connection delete "$con_name" || true
    fi
    
    # 새 연결 생성 (Static IP)
    nmcli connection add type ethernet con-name "$con_name" ifname "$ifname" \
        ipv4.method manual \
        ipv4.addresses "$ip_address" \
        ipv4.gateway "$gateway" \
        ipv4.dns "$dns" \
        autoconnect yes
    
    # 연결 활성화
    nmcli connection up "$con_name"
    log "Static IP 설정 완료"
    
    echo "success"
}

# 네트워크 상태 확인
check_network_status() {
    log "네트워크 상태 확인"
    nmcli device status
}

# 연결 정보 확인
check_connection_info() {
    local con_name=$1
    log "연결 정보 확인: $con_name"
    if nmcli connection show "$con_name" >/dev/null 2>&1; then
        nmcli connection show "$con_name"
    else
        echo "연결을 찾을 수 없습니다: $con_name"
    fi
}

# 메인 실행 부분
case "$1" in
    "dhcp")
        setup_dhcp "$2" "$3"
        ;;
    "static")
        setup_static_ip "$2" "$3" "$4" "$5" "$6"
        ;;
    "status")
        check_network_status
        ;;
    "connection_info")
        check_connection_info "$2"
        ;;
    *)
        echo "사용법: $0 {dhcp|static|status|connection_info} [parameters...]"
        echo "  dhcp <ifname> <con_name> - DHCP 설정"
        echo "  static <ifname> <con_name> <ip/cidr> <gateway> <dns> - Static IP 설정"
        echo "  status - 네트워크 상태 확인"
        echo "  connection_info <con_name> - 연결 정보 확인"
        exit 1
        ;;
esac 