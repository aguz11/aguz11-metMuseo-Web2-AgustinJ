import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import cors from "cors";
import translate from 'node-google-translate-skidz'; 

const app = express();
const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "views")));
app.use(express.json());


const traducirTexto = async (texto) => {
    if (!texto) return ''; 

    return new Promise((resolve, reject) => {
        translate({
            text: texto,
            source: 'en',
            target: 'es' 
        }, (result) => {
            if (result && result.translation) {
                resolve(result.translation);
            } else {
                reject('Error en la traducción');
            }
        });
    });
};


const traducirObjetos = async (objetos) => {
    const objetosTraducidos = [];
    
    for (const objeto of objetos) {
        try {
            const tituloTraducido = await traducirTexto(objeto.title || '');
            const culturaTraducida = await traducirTexto(objeto.culture || '');
            const dinastiaTraducida = await traducirTexto(objeto.dynasty || '');


            objetosTraducidos.push({
                ...objeto,
                title: tituloTraducido,
                culture: culturaTraducida,
                dynasty: dinastiaTraducida
            });
            
        } catch (error) {
            console.error('Error en la traducción:', error);
            objetosTraducidos.push(objeto); 
        }
    }
    return objetosTraducidos;
};


app.get("/", async (req, res) => {
    try {
        const response = await axios.get('https://collectionapi.metmuseum.org/public/collection/v1/departments')
        const departamentos = response.data.departments;
        const departamentosTraducidos  = await Promise.all(departamentos.map(async (departamento) => {
            try {
                const nombreTraducido = await traducirTexto(departamento.displayName,'en', 'es');
                return {
                    ...departamento,
                    displayName:nombreTraducido
                };
            }catch (error) {
                console.error(`Error al traducir el departamento ${departamento.displayName}:`, error);
                return departamento;
            }
        }))
        
        res.render('index',{
            departamentosTraducidos 
        });
    }catch (error) {
        console.error('Error al obtener departamentos', error);
        res.status(500).send('Error en el servidor');
    }
});


app.get("/search", async (req, res) => {

    const departmentId = req.query.departmentId || "";
    const keyword = req.query.q || "";
    const geoLocation = req.query.geoLocation || "";


    let url = `https://collectionapi.metmuseum.org/public/collection/v1/search?`;
    let hasParameter = false;

    if (departmentId) {
        url += `departmentId=${departmentId}`;
        hasParameter = true;
    }

    if (keyword) {
        url += hasParameter ? `&q=${encodeURIComponent(keyword)}` : `q=${encodeURIComponent(keyword)}`;
        hasParameter = true;
    }else if (departmentId) {
        url += hasParameter ? `&q=*` : `q=*`;
    }

    if (geoLocation) {
        url += hasParameter ? `&geoLocation=${encodeURIComponent(geoLocation)}` : `geoLocation=${encodeURIComponent(geoLocation)}`;
    }

    if (!hasParameter) {
        return res.status(400).json({ message: "Ingrese los parámetros de búsqueda." });
    }
    
    
    try {
        const response = await axios.get(url);

        if (response.data.total === 0) {
            return res.status(404).json({ message: "No se encontraron resultados para la búsqueda." });
        }
        const objects = await Promise.all(response.data.objectIDs.slice(0, 70).map(async id => {
            const objectResponse = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
            return objectResponse.data;
        }));
        
        const objetosTraducidos = await traducirObjetos(objects);
        
        res.json({ objectIDs: objetosTraducidos });
    } catch (error) {
        console.error("Error fetching data from the API:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: "Error al buscar datos." });
    }
});



app.get("/object/:objectID", async (req, res) => {
    const objectID = req.params.objectID;

    try {
        const response = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectID}`);
        const objectData = response.data;

        res.render("object", { object: objectData });
    } catch (error) {
        console.error("Error fetching object details:", error.message);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});


app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});