"""
Script para testar integrações Tuya e SNMP
Execute: python scripts/test_integrations.py
"""
import sys
import os

# Adicionar pasta raiz ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.tuya_service import tuya_service
from app.services.snmp_service import snmp_service
from dotenv import load_dotenv

load_dotenv()


def test_tuya():
    """Testa integração Tuya"""
    print("\n" + "="*50)
    print("TESTE TUYA")
    print("="*50)

    device_id = input("Digite o Device ID do Tuya: ").strip()

    if not device_id:
        print("❌ Device ID não fornecido")
        return

    # Testar status
    print("\n📊 Obtendo status...")
    status = tuya_service.get_status(device_id)

    if status is None:
        print("❌ Erro ao obter status")
        return

    print(f"✅ Status atual: {'LIGADO' if status else 'DESLIGADO'}")

    # Testar toggle
    action = input("\nDeseja alternar? (s/n): ").lower()

    if action == 's':
        if status:
            print("🔴 Desligando...")
            success = tuya_service.desligar(device_id)
        else:
            print("🟢 Ligando...")
            success = tuya_service.ligar(device_id)

        if success:
            print("✅ Comando executado com sucesso!")

            # Verificar novo status
            print("\n📊 Verificando novo status...")
            new_status = tuya_service.get_status(device_id)
            print(f"✅ Novo status: {'LIGADO' if new_status else 'DESLIGADO'}")
        else:
            print("❌ Erro ao executar comando")


def test_snmp():
    """Testa integração SNMP"""
    print("\n" + "="*50)
    print("TESTE SNMP")
    print("="*50)

    ip = input("Digite o IP do dispositivo SNMP: ").strip()
    porta = input("Digite a porta (1-10): ").strip()
    community = input("Community string [public]: ").strip() or "public"
    base_oid = input("Base OID: ").strip()

    if not ip or not porta or not base_oid:
        print("❌ Dados incompletos")
        return

    try:
        porta = int(porta)
    except ValueError:
        print("❌ Porta deve ser um número")
        return

    # Testar conexão
    print("\n🔌 Testando conexão...")
    if not snmp_service.check_connection(ip, community):
        print("❌ Não foi possível conectar ao dispositivo")
        return

    print("✅ Dispositivo acessível")

    # Testar status
    print("\n📊 Obtendo status...")
    status = snmp_service.get_status(ip, porta, community, base_oid)

    if status is None:
        print("❌ Erro ao obter status")
        return

    print(f"✅ Status atual: {'LIGADO' if status else 'DESLIGADO'}")

    # Testar toggle
    action = input("\nDeseja alternar? (s/n): ").lower()

    if action == 's':
        if status:
            print("🔴 Desligando...")
            success = snmp_service.desligar(ip, porta, community, base_oid)
        else:
            print("🟢 Ligando...")
            success = snmp_service.ligar(ip, porta, community, base_oid)

        if success:
            print("✅ Comando executado com sucesso!")

            # Verificar novo status
            print("\n📊 Verificando novo status...")
            new_status = snmp_service.get_status(ip, porta, community, base_oid)
            print(f"✅ Novo status: {'LIGADO' if new_status else 'DESLIGADO'}")
        else:
            print("❌ Erro ao executar comando")


def main():
    """Menu principal"""
    while True:
        print("\n" + "="*50)
        print("TESTE DE INTEGRAÇÕES")
        print("="*50)
        print("1. Testar Tuya")
        print("2. Testar SNMP")
        print("3. Sair")

        choice = input("\nEscolha uma opção: ").strip()

        if choice == "1":
            test_tuya()
        elif choice == "2":
            test_snmp()
        elif choice == "3":
            print("\n👋 Até logo!")
            break
        else:
            print("❌ Opção inválida")


if __name__ == "__main__":
    main()