
pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const API_URL = "PEGA_AQUI_TU_GOOGLE_SCRIPT";

let rankingData = {};

function setStatus(text){
    document.getElementById("status").innerText = text;
}

function timeToSeconds(time){

    const parts = time.split(":").map(Number);

    if(parts.length === 2){
        return parts[0]*60 + parts[1];
    }

    if(parts.length === 3){
        return parts[0]*3600 + parts[1]*60 + parts[2];
    }

    return 0;
}

function calculatePoints(winner, athlete){

    return Number(((winner / athlete) * 100).toFixed(2));
}

async function extractTextFromPDF(file){

    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument(buffer).promise;

    let text = "";

    for(let i=1;i<=pdf.numPages;i++){

        const page = await pdf.getPage(i);

        const content = await page.getTextContent();

        const strings = content.items.map(item => item.str);

        text += strings.join(" ") + "\n";
    }

    return text;
}

async function processPDFs(){

    const files = document.getElementById("pdfFiles").files;

    if(files.length === 0){
        alert("Selecciona PDFs");
        return;
    }

    for(const file of files){

        setStatus("Procesando: " + file.name);

        const text = await extractTextFromPDF(file);

        const results = parseOE2010(text, file.name);

        await saveOnline(results);
    }

    setStatus("Ranking actualizado");

    await loadRanking();
}

function parseOE2010(text, raceName){

    const lines = text.split("\n");

    let currentCategory = null;

    const grouped = {};

    const categoryRegex =
    /^([A-Z0-9ÁÉÍÓÚÜÑ\-\s]+)\s+\(\d+\/\d+\)/;

    const timeRegex =
    /(\d{1,2}:\d{2}(?::\d{2})?)$/;

    lines.forEach(line => {

        line = line.trim();

        if(!line) return;

        const catMatch = line.match(categoryRegex);

        if(catMatch){

            currentCategory = catMatch[1].trim();

            if(currentCategory.includes("Actualizado")){
                currentCategory =
                currentCategory.split("Actualizado")[0].trim();
            }

            if(!grouped[currentCategory]){
                grouped[currentCategory] = [];
            }

            return;
        }

        if(
            line.includes("No sale") ||
            line.includes("Error en tarj.") ||
            line.includes("Po Nombre Club Tiempo")
        ){
            return;
        }

        if(!currentCategory) return;

        const timeMatch = line.match(timeRegex);

        if(!timeMatch) return;

        const tiempo = timeMatch[1];

        const clean = line
        .replace(tiempo,"")
        .replace(/\+\d+:\d+/g,"")
        .trim();

        const tokens = clean.split(/\s+/);

        const posicion = parseInt(tokens[0]);

        if(isNaN(posicion)) return;

        const club = tokens[tokens.length - 1];

        const nombre = tokens
        .slice(1, tokens.length - 3)
        .join(" ")
        .trim();

        grouped[currentCategory].push({
            categoria: currentCategory,
            posicion,
            nombre,
            club,
            tiempo,
            carrera: raceName
        });
    });

    const finalResults = [];

    Object.keys(grouped).forEach(category => {

        grouped[category]
        .sort((a,b)=>a.posicion-b.posicion);

        if(grouped[category].length === 0) return;

        const winner =
        timeToSeconds(grouped[category][0].tiempo);

        grouped[category].forEach(r => {

            const athlete =
            timeToSeconds(r.tiempo);

            r.puntos =
            calculatePoints(winner, athlete);

            finalResults.push(r);
        });
    });

    return finalResults;
}

async function saveOnline(results){

    if(API_URL === "PEGA_AQUI_TU_GOOGLE_SCRIPT"){
        console.log(results);
        return;
    }

    await fetch(API_URL,{
        method:"POST",
        body:JSON.stringify(results)
    });
}

async function loadRanking(){

    if(API_URL === "PEGA_AQUI_TU_GOOGLE_SCRIPT"){
        return;
    }

    const response = await fetch(API_URL);

    const data = await response.json();

    rankingData = {};

    data.forEach(r => {

        if(!rankingData[r.categoria]){
            rankingData[r.categoria] = {};
        }

        if(!rankingData[r.categoria][r.nombre]){

            rankingData[r.categoria][r.nombre] = {
                nombre:r.nombre,
                club:r.club,
                puntos:0,
                carreras:[]
            };
        }

        rankingData[r.categoria][r.nombre].puntos += Number(r.puntos);

        rankingData[r.categoria][r.nombre].carreras.push(r);
    });

    renderRanking();
}

function renderRanking(){

    const container =
    document.getElementById("rankingContainer");

    const menu =
    document.getElementById("menuCategorias");

    container.innerHTML = "";
    menu.innerHTML = "";

    Object.keys(rankingData)
    .sort()
    .forEach(category => {

        const link = document.createElement("a");

        link.href = "#" + category;

        link.textContent = category;

        menu.appendChild(link);

        const section = document.createElement("div");

        section.className = "category";

        section.id = category;

        section.innerHTML = `<h2>${category}</h2>`;

        const table = document.createElement("table");

        table.innerHTML = `
        <thead>
        <tr>
        <th>Pos</th>
        <th>Corredor</th>
        <th>Club</th>
        <th>Puntos</th>
        <th>Pruebas</th>
        </tr>
        </thead>
        `;

        const tbody = document.createElement("tbody");

        const athletes =
        Object.values(rankingData[category])
        .sort((a,b)=>b.puntos-a.puntos);

        athletes.forEach((a,index)=>{

            const row = document.createElement("tr");

            row.innerHTML = `
            <td>${index+1}</td>
            <td>${a.nombre}</td>
            <td>${a.club}</td>
            <td>${a.puntos.toFixed(2)}</td>
            <td>${a.carreras.length}</td>
            `;

            tbody.appendChild(row);
        });

        table.appendChild(tbody);

        section.appendChild(table);

        container.appendChild(section);
    });
}

function exportCSV(){

    let csv =
    "Categoria,Posicion,Nombre,Club,Puntos,Pruebas\n";

    Object.keys(rankingData).forEach(category => {

        const athletes =
        Object.values(rankingData[category])
        .sort((a,b)=>b.puntos-a.puntos);

        athletes.forEach((a,index)=>{

            csv +=
            `${category},${index+1},${a.nombre},${a.club},${a.puntos.toFixed(2)},${a.carreras.length}\n`;
        });
    });

    const blob =
    new Blob([csv],{type:"text/csv"});

    const a =
    document.createElement("a");

    a.href =
    URL.createObjectURL(blob);

    a.download =
    "ranking_fedo.csv";

    a.click();
}

loadRanking();
