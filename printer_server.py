import win32print
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route('/print-receipt', methods=['POST'])
def print_receipt():
    data = request.json
    try:
        EIK = "831917834"
        UNP = "DT279755-0001-0017121"
        EXCHANGE_RATE = 1.95583

        amount_euro = float(data['amount_euro'])
        amount_bg = round(amount_euro * EXCHANGE_RATE, 2)
        
        receipt = [
            "      НПГ по КСТ ПРАВЕЦ при ТУ-СОФИЯ",
            "            ПРАВЕЦ УЛ.ПЕРУША 4",
            f"              ЕИК: {EIK}",
            "                     КАСА",
            "            ПРАВЕЦ УЛ.ПЕРУША 4",
            f"            ЗДДС N:BG {EIK}",
            "",
            f"00001                                #01",
            f"        УНП: {UNP}",
            "#ФАКТУРА ОРИГИНАЛ                       #",
            f"#Номер фактура: {data['invoice_num']:010d}             #",
            f"#Дата          : {datetime.now().strftime('%d-%m-%Y')}             #",
            f"#Касиер        : {data['cashier']}                    #",
            f"#Получено от   :                        #",
            f"#{data['student_name'][:25]:<25}      #",
            f"#ЕГН           : {data['egn']}              #",
            f"#Факултет:ТМТ Спец: Н                  #",
            f"#Фак.No: {data['class_num']}                        #",
            f"#Курс:0 Блок: {data['block']} Стая: {data['room']}           #",
            "#---------------------------------------#",
            f"#Месец: {data['months'][:23]:<23} #",
            f"НАЕМ                          {amount_bg:>7.2f} A",
            "-----------------------------------------",
            f"ОБЩА СУМА ЛВ                 {amount_bg:>7.2f}",
            f"ОБЩА СУМА В ЕВРО              {amount_euro:>7.2f}",
            f"ОБМ. КУРС 1 ЕВРО = {EXCHANGE_RATE} ЛВ",
            f"{'В БРОЙ ЛВ' if data['method'] == 'cash' else 'БАНК ПЪТ':<15}              {amount_bg:>7.2f}",
            "          БЛАГОДАРИМ ВИ!       ",
            "             1 АРТИКУЛ",
            f"0019153 0006          {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}",
            "",
            "        [ QR CODE SIMULATION ]",
            "",
            "          ФИСКАЛЕН БОН",
            f"DT279755                      02279755",
            "10BF992BB44A5E288FF4468E695812CF8C35F5D",
            "\n\n\n"
        ]

        receipt_text = "\n".join(receipt)
        
        printer_name = win32print.GetDefaultPrinter()
        hPrinter = win32print.OpenPrinter(printer_name)
        try:
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Receipt", None, "RAW"))
            win32print.StartPagePrinter(hPrinter)
            win32print.WritePrinter(hPrinter, receipt_text.encode('cp1251'))
            win32print.EndPagePrinter(hPrinter)
            win32print.EndDocPrinter(hPrinter)
        finally:
            win32print.ClosePrinter(hPrinter) 

        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001)