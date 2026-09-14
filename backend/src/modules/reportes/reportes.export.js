import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// Construcción de los archivos descargables. Esta capa no consulta la base:
// recibe el contenido ya resuelto por reportes.service.js y solo lo formatea.

const COLOR_TEAL = '0E7C86';
const COLOR_INK = '0D1B23';
const COLOR_WASH = 'EFF4F3';
const COLOR_LINE = 'DCE5E6';

const ENCABEZADO_INSTITUCION = 'Centro de Salud Zona 5, Mixco';
const ENCABEZADO_SISTEMA = 'Sistema de rehabilitación con órtesis inteligente';

// mysql2 devuelve DECIMAL como string para no perder precisión: se convierte
// a número solo al escribir la celda, para que Excel la trate como numérica.
const num = (valor) => (valor === null || valor === undefined || valor === '' ? null : Number(valor));
const texto = (valor) => (valor === null || valor === undefined ? '' : String(valor));

const nombrePaciente = (fila) => `${texto(fila.nombres)} ${texto(fila.apellidos)}`.trim();

// Definición de columnas por tipo de reporte. `valor` extrae el dato de la
// fila; `tipoDato` decide el formato de la celda y la alineación en el PDF.
const COLUMNAS = {
  consolidado: [
    { titulo: 'Expediente', ancho: 14, tipoDato: 'texto', valor: (f) => texto(f.codigo_expediente) },
    { titulo: 'Paciente', ancho: 26, tipoDato: 'texto', valor: nombrePaciente },
    { titulo: 'Edad', ancho: 7, tipoDato: 'entero', valor: (f) => num(f.edad) },
    { titulo: 'Sexo', ancho: 7, tipoDato: 'texto', valor: (f) => texto(f.sexo) },
    { titulo: 'Mano', ancho: 11, tipoDato: 'texto', valor: (f) => texto(f.mano_afectada) },
    { titulo: 'Diagnóstico', ancho: 24, tipoDato: 'texto', valor: (f) => texto(f.diagnostico_nombre) },
    { titulo: 'Fisioterapeuta', ancho: 24, tipoDato: 'texto', valor: (f) => texto(f.fisioterapeuta_nombre) },
    { titulo: 'Fecha', ancho: 12, tipoDato: 'texto', valor: (f) => texto(f.fecha) },
    { titulo: 'Duración (min)', ancho: 14, tipoDato: 'decimal', valor: (f) => num(f.duracion_minutos) },
    { titulo: 'Rango máx (°)', ancho: 14, tipoDato: 'decimal', valor: (f) => num(f.rango_articular) },
    { titulo: 'Rango prom (°)', ancho: 15, tipoDato: 'decimal', valor: (f) => num(f.rango_promedio) },
    { titulo: 'Reps', ancho: 8, tipoDato: 'entero', valor: (f) => num(f.repeticiones_total) },
    { titulo: 'FC mín', ancho: 9, tipoDato: 'entero', valor: (f) => num(f.fc_min) },
    { titulo: 'FC máx', ancho: 9, tipoDato: 'entero', valor: (f) => num(f.fc_max) },
    { titulo: 'FC prom', ancho: 10, tipoDato: 'entero', valor: (f) => num(f.fc_promedio) },
    { titulo: 'Estado', ancho: 13, tipoDato: 'texto', valor: (f) => texto(f.estado) },
    { titulo: 'Observaciones', ancho: 30, tipoDato: 'texto', valor: (f) => texto(f.observaciones) },
  ],
  diagnostico: [
    { titulo: 'Diagnóstico', ancho: 34, tipoDato: 'texto', valor: (f) => texto(f.diagnostico_nombre) },
    { titulo: 'Pacientes', ancho: 12, tipoDato: 'entero', valor: (f) => num(f.pacientes) },
    { titulo: 'Sesiones', ancho: 12, tipoDato: 'entero', valor: (f) => num(f.sesiones) },
    { titulo: 'Finalizadas', ancho: 13, tipoDato: 'entero', valor: (f) => num(f.sesiones_finalizadas) },
    { titulo: 'Rango prom (°)', ancho: 15, tipoDato: 'decimal', valor: (f) => num(f.rango_promedio) },
    { titulo: 'Rango máx (°)', ancho: 14, tipoDato: 'decimal', valor: (f) => num(f.rango_maximo) },
    { titulo: 'Mejora (%)', ancho: 12, tipoDato: 'entero', valor: (f) => num(f.mejora_pct) },
  ],
  evolucion: [
    { titulo: 'Sesión', ancho: 10, tipoDato: 'texto', valor: (f) => texto(f.etiqueta) },
    { titulo: 'Fecha', ancho: 13, tipoDato: 'texto', valor: (f) => texto(f.fecha) },
    { titulo: 'Duración (min)', ancho: 15, tipoDato: 'decimal', valor: (f) => num(f.duracion_minutos) },
    { titulo: 'Rango máx (°)', ancho: 15, tipoDato: 'decimal', valor: (f) => num(f.rango_articular) },
    { titulo: 'Rango prom (°)', ancho: 16, tipoDato: 'decimal', valor: (f) => num(f.rango_promedio) },
    { titulo: 'Reps', ancho: 9, tipoDato: 'entero', valor: (f) => num(f.repeticiones_total) },
    { titulo: 'FC prom', ancho: 11, tipoDato: 'entero', valor: (f) => num(f.fc_promedio) },
    { titulo: 'Estado', ancho: 14, tipoDato: 'texto', valor: (f) => texto(f.estado) },
  ],
};

function formatearFechaHora(fecha) {
  return new Date(fecha).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Líneas de contexto que encabezan cualquier reporte: período aplicado,
// paciente si el reporte es individual y quién lo generó.
function lineasEncabezado(contenido, meta) {
  const filtros = meta.filtros ?? {};
  const { totales } = contenido;
  const lineas = [];

  const desde = filtros.fecha_inicio ?? totales?.fecha_inicio;
  const hasta = filtros.fecha_fin ?? totales?.fecha_fin;
  lineas.push(['Período', `${texto(desde)} al ${texto(hasta)}`]);

  if (contenido.paciente) {
    const p = contenido.paciente;
    lineas.push(['Paciente', `${p.codigo_expediente} · ${nombrePaciente(p)}`]);
    lineas.push([
      'Diagnóstico',
      `${texto(p.diagnostico_nombre) || 'Sin diagnóstico'} · mano ${texto(p.mano_afectada).toLowerCase()}`,
    ]);
  }

  if (totales) {
    lineas.push([
      'Sesiones',
      `${texto(totales.sesiones_total)} registradas · ${texto(totales.sesiones_finalizadas)} finalizadas · ` +
        `${texto(totales.sesiones_canceladas)} canceladas`,
    ]);
    lineas.push([
      'Pacientes atendidos',
      `${texto(totales.pacientes)} · rango promedio ${texto(totales.rango_promedio) || '—'}° · ` +
        `FC promedio ${texto(totales.fc_promedio) || '—'} bpm`,
    ]);
  }

  lineas.push(['Generado por', `${texto(meta.generado_por)} · ${formatearFechaHora(meta.generado_en)}`]);
  lineas.push(['Documento', texto(meta.documento)]);

  return lineas;
}

export async function construirExcel(contenido, meta) {
  const columnas = COLUMNAS[contenido.tipo];
  const libro = new ExcelJS.Workbook();

  libro.creator = ENCABEZADO_SISTEMA;
  libro.created = meta.generado_en;

  const hoja = libro.addWorksheet(meta.tipo_nombre.slice(0, 31), {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const ultimaColumna = columnas.length;

  // Encabezado institucional.
  hoja.mergeCells(1, 1, 1, ultimaColumna);
  const celdaTitulo = hoja.getCell(1, 1);
  celdaTitulo.value = `${ENCABEZADO_INSTITUCION} — ${meta.tipo_nombre}`;
  celdaTitulo.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  celdaTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_TEAL}` } };
  celdaTitulo.alignment = { vertical: 'middle', horizontal: 'left' };
  hoja.getRow(1).height = 26;

  hoja.mergeCells(2, 1, 2, ultimaColumna);
  const celdaSub = hoja.getCell(2, 1);
  celdaSub.value = ENCABEZADO_SISTEMA;
  celdaSub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: `FF${COLOR_INK}` } };

  // Bloque de contexto (período, filtros, totales).
  let fila = 4;
  for (const [etiqueta, valor] of lineasEncabezado(contenido, meta)) {
    hoja.getCell(fila, 1).value = etiqueta;
    hoja.getCell(fila, 1).font = { name: 'Calibri', size: 10, bold: true };
    hoja.mergeCells(fila, 2, fila, ultimaColumna);
    hoja.getCell(fila, 2).value = valor;
    hoja.getCell(fila, 2).font = { name: 'Calibri', size: 10 };
    fila += 1;
  }

  fila += 1;

  // Encabezado de la tabla.
  const filaEncabezado = hoja.getRow(fila);
  columnas.forEach((col, i) => {
    const celda = filaEncabezado.getCell(i + 1);
    celda.value = col.titulo;
    celda.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_INK}` } };
    celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    hoja.getColumn(i + 1).width = col.ancho;
  });
  filaEncabezado.height = 22;

  const primeraFilaDatos = fila + 1;

  // Filas de datos.
  contenido.filas.forEach((registro, indice) => {
    const filaExcel = hoja.getRow(primeraFilaDatos + indice);
    columnas.forEach((col, i) => {
      const celda = filaExcel.getCell(i + 1);
      celda.value = col.valor(registro);
      celda.font = { name: 'Calibri', size: 10 };
      celda.alignment = { horizontal: col.tipoDato === 'texto' ? 'left' : 'right' };
      if (col.tipoDato === 'decimal') celda.numFmt = '0.00';
      if (col.tipoDato === 'entero') celda.numFmt = '0';
      if (indice % 2 === 1) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_WASH}` } };
      }
      celda.border = { bottom: { style: 'hair', color: { argb: `FF${COLOR_LINE}` } } };
    });
  });

  if (contenido.filas.length === 0) {
    hoja.mergeCells(primeraFilaDatos, 1, primeraFilaDatos, ultimaColumna);
    hoja.getCell(primeraFilaDatos, 1).value = 'No hay sesiones que cumplan los criterios seleccionados.';
    hoja.getCell(primeraFilaDatos, 1).font = { name: 'Calibri', size: 10, italic: true };
  } else {
    // Autofiltro sobre el encabezado de la tabla.
    hoja.autoFilter = {
      from: { row: fila, column: 1 },
      to: { row: primeraFilaDatos + contenido.filas.length - 1, column: ultimaColumna },
    };
    hoja.views = [{ state: 'frozen', ySplit: fila }];
  }

  const buffer = await libro.xlsx.writeBuffer();

  return {
    buffer: Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

export async function construirPdf(contenido, meta) {
  const columnas = COLUMNAS[contenido.tipo];
  // El consolidado tiene 17 columnas: solo cabe en horizontal.
  const horizontal = contenido.tipo === 'consolidado';

  const doc = new PDFDocument({
    size: 'A4',
    layout: horizontal ? 'landscape' : 'portrait',
    margin: 32,
    bufferPages: true, // necesario para numerar las páginas al final
    info: { Title: `${meta.tipo_nombre} — ${meta.documento}`, Author: ENCABEZADO_SISTEMA },
  });

  const trozos = [];
  doc.on('data', (trozo) => trozos.push(trozo));
  const terminado = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(trozos)));
    doc.on('error', reject);
  });

  const izquierda = doc.page.margins.left;
  const anchoUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Anchos proporcionales a los definidos para Excel.
  const sumaAnchos = columnas.reduce((total, col) => total + col.ancho, 0);
  const anchos = columnas.map((col) => (col.ancho / sumaAnchos) * anchoUtil);

  // --- Banda de título ---
  doc.rect(izquierda, doc.y, anchoUtil, 34).fill(`#${COLOR_TEAL}`);
  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(meta.tipo_nombre, izquierda + 10, doc.y + 7, { width: anchoUtil - 20 });
  doc
    .font('Helvetica')
    .fontSize(8)
    .text(`${ENCABEZADO_INSTITUCION} · ${ENCABEZADO_SISTEMA}`, izquierda + 10, doc.y + 1, {
      width: anchoUtil - 20,
    });
  doc.moveDown(1.4);

  // --- Bloque de contexto ---
  doc.fillColor(`#${COLOR_INK}`).fontSize(9);
  for (const [etiqueta, valor] of lineasEncabezado(contenido, meta)) {
    doc.font('Helvetica-Bold').text(`${etiqueta}: `, { continued: true });
    doc.font('Helvetica').text(valor);
  }
  doc.moveDown(0.8);

  // --- Tabla ---
  const altoFila = 16;

  const dibujarEncabezadoTabla = () => {
    const y = doc.y;
    doc.rect(izquierda, y, anchoUtil, altoFila + 4).fill(`#${COLOR_INK}`);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7);
    let x = izquierda;
    columnas.forEach((col, i) => {
      doc.text(col.titulo, x + 3, y + 6, { width: anchos[i] - 6, ellipsis: true, lineBreak: false });
      x += anchos[i];
    });
    doc.y = y + altoFila + 4;
    doc.fillColor(`#${COLOR_INK}`);
  };

  dibujarEncabezadoTabla();

  if (contenido.filas.length === 0) {
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .text('No hay sesiones que cumplan los criterios seleccionados.', izquierda + 4, doc.y + 8);
  }

  doc.font('Helvetica').fontSize(7);

  contenido.filas.forEach((registro, indice) => {
    // Salto de página conservando el encabezado de la tabla.
    if (doc.y + altoFila > doc.page.height - doc.page.margins.bottom - 18) {
      doc.addPage();
      dibujarEncabezadoTabla();
      doc.font('Helvetica').fontSize(7);
    }

    const y = doc.y;
    if (indice % 2 === 1) {
      doc.rect(izquierda, y, anchoUtil, altoFila).fill(`#${COLOR_WASH}`);
      doc.fillColor(`#${COLOR_INK}`);
    }

    let x = izquierda;
    columnas.forEach((col, i) => {
      const valor = col.valor(registro);
      const mostrado =
        valor === null || valor === undefined || valor === ''
          ? '—'
          : col.tipoDato === 'decimal'
            ? Number(valor).toFixed(2)
            : String(valor);
      doc.text(mostrado, x + 3, y + 4, {
        width: anchos[i] - 6,
        align: col.tipoDato === 'texto' ? 'left' : 'right',
        ellipsis: true,
        lineBreak: false,
      });
      x += anchos[i];
    });

    doc
      .moveTo(izquierda, y + altoFila)
      .lineTo(izquierda + anchoUtil, y + altoFila)
      .strokeColor(`#${COLOR_LINE}`)
      .lineWidth(0.4)
      .stroke();

    doc.y = y + altoFila;
  });

  // --- Pie con numeración en todas las páginas ---
  const paginas = doc.bufferedPageRange();
  for (let i = 0; i < paginas.count; i += 1) {
    doc.switchToPage(paginas.start + i);
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#5E7480')
      .text(
        `${meta.documento} · página ${i + 1} de ${paginas.count}`,
        izquierda,
        doc.page.height - doc.page.margins.bottom + 8,
        { width: anchoUtil, align: 'right' },
      );
  }

  doc.end();

  return { buffer: await terminado, contentType: 'application/pdf' };
}
