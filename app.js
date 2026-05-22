pdfjsLib.GlobalWorkerOptions.workerSrc =
'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const API_URL = "PEGA_AQUI_TU_GOOGLE_SCRIPT";

let rankingData = {};

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

        const strings = content.items.map(i=>i.str);

        text += strings.join(" ") + "\n";
    }

    return text;
}

async function processPDFs(){

    const files = document.getElementById("pdfFiles").files;

    for(const file of files){

        const text = await extractTextFromPDF(file);

        parsePDF(text, file.name);
    }

    loadRanking();
}

function parsePDF(text, raceName){

    const lines = text.split("\n");

    let currentCategory = null;

    const raceResults = [];

    const categoryRegex = /^([A-Z][A-Z0-9\-\s]+)\s+\(/;

    const resultRegex = /(\d+)\s+([A-Za-zÁÉÍÓÚÜÑñ\-\s]+)\s+([A-Z0-9\-]+)\s+(\d{1,2}:\d{2}(?::\d{2})?)/;

    const grouped = {};

    lines.forEach(line=>{

        line = line.trim();

        const catMatch = line.match(categoryRegex);

        if(catMatch){

            currentCategory = catMatch[1].trim();

            if(!grouped[currentCategory]){
                grouped[currentCategory] = [];
            }

            return;
        }

        const resMatch = line.match(resultRegex);

        if(resMatch && currentCategory){

            grouped[currentCategory].push({
                posicion: parseInt(resMatch[1]),
                nombre: resMatch[2].trim(),
                club: resMatch[3].trim(),
                tiempo: resMatch[4].trim(),
                carrera: raceName,
                categoria: currentCategory
            });
        }
    });

    Object.keys(grouped).forEach(cat=>{

        grouped[cat].sort((a,b)=>a.posicion-b.posicion);

        const winner = timeToSeconds(grouped[cat][0].tiempo);

        grouped[cat].forEach(r=>{

            const athlete = timeToSeconds(r.tiempo);

            r.puntos = calculatePoints(winner, athlete);

            raceResults.push(r);
        });
    });

    saveOnline(raceResults);
}

async function saveOnline(results){

    await fetch(API_URL,{
        method:"POST",
        body:JSON.stringify(results)
    });
}

async function loadRanking(){

    const response = await fetch(API_URL);

    const data = await response.json();

    rankingData = {};

    data.forEach(r=>{

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

    const container = document.getElementById("rankingContainer");
    const menu = document.getElementById("menuCategorias");

    container.innerHTML = "";
    menu.innerHTML = "";

    Object.keys(rankingData).sort().forEach(category=>{

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
        <th>Nombre</th>
        <th>Club</th>
        <th>Total</th>
        <th>Pruebas</th>
        </tr>
        </thead>
        `;

        const tbody = document.createElement("tbody");

        const athletes = Object.values(rankingData[category])
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

    let csv = "Categoria,Posicion,Nombre,Club,Puntos\n";

    Object.keys(rankingData).forEach(category=>{

        const athletes = Object.values(rankingData[category])
        .sort((a,b)=>b.puntos-a.puntos);

        athletes.forEach((a,index)=>{

            csv += `${category},${index+1},${a.nombre},${a.club},${a.puntos.toFixed(2)}\n`;
        });
    });

    const blob = new Blob([csv],{type:"text/csv"});

    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);

    a.download = "ranking_fedo.csv";

    a.click();
}

function resetRanking(){

    if(confirm("¿Borrar ranking online?")){

        alert("Borra manualmente la hoja Resultados en Google Sheets.");
    }
}

loadRanking();
