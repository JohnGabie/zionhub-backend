import tinytuya

ips = ["192.168.100.138", "192.168.100.184", "192.168.100.185"]

print(f"{'IP':<15} | {'Status':<10} | {'Device ID':<25} | {'Versão'}")
print("-" * 60)

for ip in ips:
    # Tentamos apenas ler o status básico que não exige a Local Key para identificar o ID
    d = tinytuya.OutletDevice('DEVICE_ID_TEMPORARIO', ip, 'LOCAL_KEY_TEMPORARIA')
    d.set_version(3.3) # Tenta 3.3 primeiro

    try:
        # O comando find_devices ou get_status pode revelar o ID mesmo sem a key em alguns firmwares
        data = d.status()
        # Mesmo que dê erro de decodificação por falta da Key,
        # o tinytuya costuma conseguir ler o Device ID no cabeçalho do pacote.
        print(f"{ip:<15} | Online     | {d.id:<25} | {d.version}")
    except:
        print(f"{ip:<15} | Offline/Erro")