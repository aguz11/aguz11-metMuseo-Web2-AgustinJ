document.addEventListener('DOMContentLoaded', () => {
    const departmentSelect = document.getElementById('department');
    const FormBusqueda = document.getElementById('FormBusqueda');
    const resultsDiv = document.getElementById('results');
    const paginacionDiv = document.getElementById('paginacion');
    

    let pagActual = 1;
    let pagTotal = 1;
    const resultPorPag = 20; 
    let objectIds = []; 

    function showLoading() {
        document.getElementById("loadingSpinner").style.display = "flex";
        document.getElementById("spinner").style.display = "block";
    }
    
    function hideLoading() {
        document.getElementById("loadingSpinner").style.display = "none";
        document.getElementById("spinner").style.display = "none";
    }

    
    fetch('https://collectionapi.metmuseum.org/public/collection/v1/departments')
        .then(response => response.json())
        .then(data => {
            data.departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.departmentId;
                option.textContent = dept.displayName;
                departmentSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error cargando departamentos:', error));

    

    FormBusqueda.addEventListener('submit', (event) => {
        event.preventDefault();
        showLoading();
        const departmentId = departmentSelect.value;
        const keyword = document.getElementById('keyword').value.trim();
        const geoLocation = document.getElementById('geoLocation').value.trim();
        
        console.log("GeoLocation:", geoLocation);

        if (!departmentId && !keyword && !geoLocation) {
            alert("Ingrese al menos un parámetro de búsqueda.");
            return;
        }


        const searchParams = new URLSearchParams();
        if (departmentId) searchParams.append('departmentId', departmentId);
        if (geoLocation) searchParams.append('geoLocation', geoLocation);
        if (keyword) searchParams.append('q', keyword);


        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = '';



        fetch(`/search?${searchParams.toString()}`)
            .then(response => response.json())
            .then(data => {
                if (!data.objectIDs || data.objectIDs.length === 0) {
                    document.getElementById('noResultsMessage').classList.remove('hidden');
                    paginacionDiv.innerHTML = '';
                    return;
                }else{
                    hideLoading();
                }

                document.getElementById('noResultsMessage').classList.add('hidden');



                objectIds = data.objectIDs; 
                pagTotal = Math.ceil(objectIds.length / resultPorPag);
                pagActual = 1; 
                displayResults(objectIds);
                setuppaginacion();
            })
            .catch(error => {
                console.error("Error al obtener datos:", error);
                resultsDiv.innerHTML = `<p>Ingrese palabra clave.</p>`;
            })
            .finally(() => {
                //document.getElementById("loadingMessage").style.display = "none";
                hideLoading();            
            });
    });



    function displayResults(objectIds) {
        resultsDiv.innerHTML = '';
        const startIndex = (pagActual - 1) * resultPorPag;
        const endIndex = startIndex + resultPorPag;
        

        const filtrarIds = objectIds.filter(id => {
            return id.primaryImageSmall;
        });

        const paginatedIds = filtrarIds.slice(startIndex, endIndex);

        paginatedIds.forEach(object => {
            const id = object.objectID;
            if (typeof id !== 'number') {
                console.error(`ID no válido: ${id}`);
                resultsDiv.innerHTML += `<p>ID no válido: ${id}</p>`;
            }
            fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)
                .then(response => response.json())
                .then(objectData => {
                    console.log(objectData.period)
                    const card = document.createElement('div');
                    card.className = 'card';
                    
                    const additionalImagesLink = objectData.additionalImages && objectData.additionalImages.length > 0 
                    ? `<a href="/object/${objectData.objectID}">Ver imágenes adicionales</a>` 
                    : '';


                    card.innerHTML = `               
                        <img src="${object.primaryImageSmall || 'sinImagen.jpg'}"
                        alt="${object.title}" 
                        class="img-small"
                        title="${objectData.objectDate ? 'Fecha de creación: ' + objectData.objectDate : 'Sin fecha disponible'}">
                        <h3>${object.title}</h3>
                        <p>Cultura: ${object.culture || 'N/A'}</p>
                        <p>Dinastía: ${object.dynasty || 'N/A'}</p>
                        ${additionalImagesLink}
                    `;
                    resultsDiv.appendChild(card);
                })
                .catch(error => console.error('Error cargando objeto:', error));

        });
    }

    
    function setuppaginacion() {
        paginacionDiv.innerHTML = '';
        if (pagTotal > 1) {
        const botonAnterior = document.createElement('button');
        botonAnterior.textContent = 'Anterior';
        botonAnterior.disabled = pagActual === 1;
        botonAnterior.onclick = () => {
        if (pagActual > 1) {
            pagActual--;
            displayResults(objectIds);
            setuppaginacion();
            }
        };
        paginacionDiv.appendChild(botonAnterior);

        const botonSiguiente = document.createElement('button');
        botonSiguiente.textContent = 'Siguiente';
        botonSiguiente.disabled = pagActual === pagTotal;
        botonSiguiente.onclick = () => {
            if (pagActual < pagTotal) {
            pagActual++;
            displayResults(objectIds);
            setuppaginacion();
            }
        };
        paginacionDiv.appendChild(botonSiguiente);
        }
    }
});

