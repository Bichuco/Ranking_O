
function doPost(e){

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("Resultados");

  const data = JSON.parse(e.postData.contents);

  data.forEach(r => {

    sheet.appendRow([
      r.categoria,
      r.nombre,
      r.club,
      r.tiempo,
      r.puntos,
      r.carrera
    ]);
  });

  return ContentService
    .createTextOutput("OK");
}

function doGet(){

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("Resultados");

  const values =
    sheet.getDataRange().getValues();

  values.shift();

  const result = values.map(r => ({
    categoria:r[0],
    nombre:r[1],
    club:r[2],
    tiempo:r[3],
    puntos:r[4],
    carrera:r[5]
  }));

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
