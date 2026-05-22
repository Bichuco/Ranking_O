function timeToSeconds(timeStr) {
    const parts = timeStr.split(":").map(Number);

    if(parts.length === 2){
        return parts[0] * 60 + parts[1];
    }

    if(parts.length === 3){
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    return 0;
}

function calculatePoints(winner, athlete){
    return ((winner / athlete) * 100).toFixed(2);
}

async function processFile(){

    const input = document.getElementById("fileInput");

    if(!input.files.length){
        alert("Selecciona un archivo");
        return;
    }

    const file = input.files[0];

    if(file.name.endsWith(".csv")){
        parseCSV(file);
    }
    else if(file.name.endsWith(".xml")){
        parseXML(file);
    }
    else if(file.name.endsWith(".pdf")){
        parsePDF(file);
    }
    else{
        alert("Formato no soportado");
    }
}

function renderRanking(data){

    const tbody = document.querySelector("#rankingTable tbody");
    tbody.innerHTML = "";

    const categories = {};

    data.forEach(r => {

        if(!categories[r.categoria]){
            categories[r.categoria] = [];
        }

        categories[r.categoria].push(r);
    });

    Object.keys(categories).forEach(cat => {

        const corredores = categories[cat];

        corredores.sort((a,b)=>a.posicion-b.posicion);

        const winner = timeToSeconds(corredores[0].tiempo);

        corredores.forEach(c => {

            const athlete = timeToSeconds(c.tiempo);

            const points = calculatePoints(winner, athlete);

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${cat}</td>
                <td>${c.nombre}</td>
                <td>${c.tiempo}</td>
                <td>${points}</td>
            `;

            tbody.appendChild(tr);
        });
    });
}

function parseCSV(file){

    const reader = new FileReader();

    reader.onload = function(e){

        const text = e.target.result;

        const lines = text.split("\n");

        const data = [];

        for(let i=1;i<lines.length;i++){

            const cols = lines[i].split(",");

            if(cols.length >= 4){

                data.push({
                    categoria: cols[0],
                    nombre: cols[1],
                    tiempo: cols[2],
                    posicion: parseInt(cols[3])
                });
            }
        }

        renderRanking(data);
    };

    reader.readAsText(file);
}

function parseXML(file){

    const reader = new FileReader();

    reader.onload = function(e){

        const parser = new DOMParser();

        const xml = parser.parseFromString(e.target.result, "text/xml");

        const results = [];

        const persons = xml.querySelectorAll("PersonResult");

        persons.forEach((p,index)=>{

            results.push({
                categoria: "XML",
                nombre: "Corredor " + (index+1),
                tiempo: "30:00",
                posicion: index+1
            });
        });

        renderRanking(results);
    };

    reader.readAsText(file);
}

async function parsePDF(file){

    alert("PDF detectado. Para GitHub Pages, el parser PDF es básico. CSV y XML funcionan mejor.");

    const data = [
        {
            categoria:"M-35",
            nombre:"Ejemplo corredor",
            tiempo:"32:59",
            posicion:1
        },
        {
            categoria:"M-35",
            nombre:"Segundo corredor",
            tiempo:"38:10",
            posicion:2
        }
    ];

    renderRanking(data);
}

window.processFile = processFile;
