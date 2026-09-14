import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Packer,
  ShadingType,
} from "docx";
import { LeadCalculationBreakdownLine } from "../types";

export interface DocxEstimateData {
  clientName: string;
  clientPhone?: string;
  clientCity?: string;
  clientChannel?: string;
  dateStr: string;
  masterName?: string;
  masterPhone?: string;
  breakdown: LeadCalculationBreakdownLine[];
  estimateMin: number;
  estimateMax: number;
  rawMin?: number;
  rawMax?: number;
  discountPercent?: number;
}

export async function generateEstimateDocx(data: DocxEstimateData): Promise<Blob> {
  const masterName = data.masterName || "Александр";
  const masterPhone = data.masterPhone || "+7 (914) 809-23-45";
  const dateStr = data.dateStr || new Date().toLocaleDateString("ru-RU");

  // Цвета ячеек таблицы
  const headerBg = "115E59"; // Teal-800
  const totalBg = "F0FDFA";  // Teal-50
  const altRowBg = "F9FAFB"; // Gray-50

  // Создаем строки для таблицы
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 600, type: WidthType.DXA },
        shading: { fill: headerBg, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "№", bold: true, color: "FFFFFF" })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 4800, type: WidthType.DXA },
        shading: { fill: headerBg, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: "Наименование работ и материалов", bold: true, color: "FFFFFF" })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 1100, type: WidthType.DXA },
        shading: { fill: headerBg, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Объём", bold: true, color: "FFFFFF" })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 900, type: WidthType.DXA },
        shading: { fill: headerBg, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Ед. изм.", bold: true, color: "FFFFFF" })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 2200, type: WidthType.DXA },
        shading: { fill: headerBg, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Диапазон цен (₽)", bold: true, color: "FFFFFF" })],
          }),
        ],
      }),
    ],
  });

  const tableRows: TableRow[] = [headerRow];

  data.breakdown.forEach((item, index) => {
    const isAlt = index % 2 === 1;
    const isDiscount = item.category === "discount";
    const priceText = isDiscount
      ? `−${Math.abs(item.min_total).toLocaleString("ru-RU")} … −${Math.abs(item.max_total).toLocaleString("ru-RU")} ₽`
      : item.min_total === item.max_total
      ? `${item.min_total.toLocaleString("ru-RU")} ₽`
      : `${item.min_total.toLocaleString("ru-RU")} – ${item.max_total.toLocaleString("ru-RU")} ₽`;

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 600, type: WidthType.DXA },
            shading: isAlt ? { fill: altRowBg, type: ShadingType.CLEAR } : undefined,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(index + 1) })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4800, type: WidthType.DXA },
            shading: isAlt ? { fill: altRowBg, type: ShadingType.CLEAR } : undefined,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: item.label,
                    bold: isDiscount,
                    color: isDiscount ? "047857" : "1F2937",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1100, type: WidthType.DXA },
            shading: isAlt ? { fill: altRowBg, type: ShadingType.CLEAR } : undefined,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(item.quantity) })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 900, type: WidthType.DXA },
            shading: isAlt ? { fill: altRowBg, type: ShadingType.CLEAR } : undefined,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: item.unit })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2200, type: WidthType.DXA },
            shading: isAlt ? { fill: altRowBg, type: ShadingType.CLEAR } : undefined,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: priceText,
                    bold: isDiscount,
                    color: isDiscount ? "047857" : "1F2937",
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  });

  // Итоговая строка
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: { fill: totalBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: data.discountPercent && data.discountPercent > 0
                    ? `ИТОГО ПОД КЛЮЧ (с учетом скидки −${data.discountPercent}%):`
                    : "ИТОГО ПОД КЛЮЧ:",
                  bold: true,
                  size: 22,
                  color: "0F766E",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          shading: { fill: totalBg, type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: `${data.estimateMin.toLocaleString("ru-RU")} – ${data.estimateMax.toLocaleString("ru-RU")} ₽`,
                  bold: true,
                  size: 24,
                  color: "0F766E",
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 900,
              right: 900,
            },
          },
        },
        children: [
          // Шапка
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: "ФЕНИКС PRO — Натяжные потолки",
                bold: true,
                size: 32,
                color: "0F766E",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Профессиональный монтаж без пыли • Гарантия 15 лет • Официальный договор",
                italics: true,
                color: "6B7280",
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          // Разделитель
          new Paragraph({
            text: "─────────────────────────────────────────────────────────────────────────────",
            spacing: { after: 200 },
            children: [],
          }),

          // Данные заказа и мастера
          new Paragraph({
            children: [
              new TextRun({ text: "Контакты мастера: ", bold: true }),
              new TextRun({ text: `${masterName}, тел: ${masterPhone} (WhatsApp / Telegram)` }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Дата расчета: ", bold: true }),
              new TextRun({ text: dateStr }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Заказчик: ", bold: true }),
              new TextRun({ text: data.clientName }),
              data.clientPhone ? new TextRun({ text: ` (тел: ${data.clientPhone})` }) : new TextRun({ text: "" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Адрес / Район: ", bold: true }),
              new TextRun({ text: data.clientCity || "г. Улан-Удэ и пригород (до 50 км)" }),
              data.clientChannel ? new TextRun({ text: ` • Канал: ${data.clientChannel.toUpperCase()}` }) : new TextRun({ text: "" }),
            ],
            spacing: { after: 300 },
          }),

          // Заголовок сметы
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({
                text: "Предварительный сметный расчёт",
                bold: true,
                size: 24,
                color: "1F2937",
              }),
            ],
            spacing: { after: 150 },
          }),

          // Таблица сметы
          new Table({
            rows: tableRows,
            width: {
              size: 9600,
              type: WidthType.DXA,
            },
          }),

          // Примечание
          new Paragraph({
            spacing: { before: 200, after: 300 },
            children: [
              new TextRun({
                text: "* Примечание: Предварительный расчет составлен на основе параметров помещения. Итоговая фиксированная стоимость определяется после бесплатного выезда замерщика с образцами материалов и точного лазерного замера геометрии стен.",
                italics: true,
                size: 18,
                color: "4B5563",
              }),
            ],
          }),

          // Блок гарантий
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [
              new TextRun({
                text: "Официальные гарантии компании:",
                bold: true,
                size: 22,
                color: "0F766E",
              }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• 3 года ", bold: true }),
              new TextRun({ text: "— гарантия на все виды монтажных работ и электрические подключения." }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• 10 лет ", bold: true }),
              new TextRun({ text: "— официальная заводская гарантия на полотно (MSD Premium / Bauf) от провисания и выцветания." }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Безопасность: ", bold: true }),
              new TextRun({ text: "монтаж взрывобезопасными композитными баллонами Ragasco и перфораторами с пылесосом." }),
            ],
            spacing: { after: 300 },
          }),

          // Подвал
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `С уважением, мастер ${masterName} • тел: ${masterPhone} • ФЕНИКС PRO`,
                bold: true,
                size: 18,
                color: "6B7280",
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export function downloadEstimateDocx(data: DocxEstimateData) {
  generateEstimateDocx(data).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (data.clientName || "Клиент").replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_");
    const dateFormatted = new Date().toISOString().slice(0, 10);
    a.download = `Смета_ФениксPRO_${safeName}_${dateFormatted}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
