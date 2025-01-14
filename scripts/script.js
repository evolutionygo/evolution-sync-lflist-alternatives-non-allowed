const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Variables
const LFLIST_FILE = 'lflist.conf';
const CURRENT_YEAR = new Date().getFullYear();
const PREVIOUS_YEAR = CURRENT_YEAR - 1;

// Obtener el token de las variables de entorno
const TOKEN = process.env.TOKEN;

// URL del repositorio de destino, usando el token
const DEST_REPO_URL = `https://${TOKEN}@github.com/termitaklk/koishi-Iflist-clients.git`;

// Objeto para especificar las listas que deben permanecer y su orden
const banlistsOrder = {
  1: "2024.12 TCG",
  2: "2005.4 GOAT",
  3: "2024.10.01 Rush Prereleases",
  4: "2024.07 Speed Duel",
  5: "2024.09 Traditional",
  6: "2024.09 World",
  7: "Edison(PreErrata)",
  8: "2014.4 HAT",
  9: "JTP (Original)",
  10: "GX-Marzo-2008",
  11: "2011.09 Tengu Plant",
  12: "MD 08.2024",
  13: "2024.05 TDG",
  14: "2019.10 Eterno",
  15: "2015.4 Duel Terminal",
  16: "2008.03 DAD Return",
  17: "MDC - Evolution S6",
  18: "2024.10 KS",
  19: "2024.9 TCG KS",
  20: "2025.01 OCG",
  21: "JTP (AllCards)",
};

// Función para clonar un repositorio
function cloneRepo(repoUrl, targetDir) {
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  execSync(`git clone ${repoUrl} ${targetDir}`);
  console.log(`Clonado el repositorio ${repoUrl} en ${targetDir}`);
}

// Función para leer el archivo lflist.conf y devolver las listas con su contenido
function readLflistWithContent(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  const lines = data.split('\n');
  const listsWithContent = {};
  let currentList = null;

  lines.forEach((line) => {
    line = line.trim(); // Eliminar caracteres extra como \r
    if (line.startsWith('!')) {
      currentList = line; // Iniciar una nueva lista
      listsWithContent[currentList] = []; // Crear un array para su contenido
    } else if (currentList && line.trim() !== '') {
      // Dividir la línea en partes
      const parts = line.split(/\s+/); // Separar por espacios
      if (parts.length >= 2 && (parts[1] === '3' || parts[1] === '-1')) {
        // Omitir la línea si el segundo valor es "3"
        return;
      }
      // Añadir contenido a la lista actual
      listsWithContent[currentList].push(line);
    }
  });

  console.log("Listas extraídas de lflist.conf:", Object.keys(listsWithContent));
  return listsWithContent;
}

// Función para recorrer los archivos .conf en el repositorio de comparación y devolver las listas con su contenido
function readConfFilesWithContent(confRepoPath) {
  const confFiles = fs.readdirSync(confRepoPath).filter(file => file.endsWith('.conf'));
  let listsWithContent = {};

  confFiles.forEach(file => {
    const filePath = path.join(confRepoPath, file);
    const fileData = fs.readFileSync(filePath, 'utf8');
    const lines = fileData.split('\n');
    let currentList = null;

    lines.forEach((line) => {
      line = line.trim(); // Eliminar caracteres extra como \r
      if (line.startsWith('!')) {
        currentList = line; // Iniciar una nueva lista
        listsWithContent[currentList] = []; // Crear un array para su contenido
      } else if (currentList && line.trim() !== '') {
        // Dividir la línea en partes
        const parts = line.split(/\s+/); // Separar por espacios
        if (parts.length >= 2 && (parts[1] === '3' || parts[1] === '-1')) {
          // Omitir la línea si el segundo valor es "3"
          return;
        }
        // Añadir contenido a la lista actual
        listsWithContent[currentList].push(line);
      }
    });
  });

  console.log("Listas extraídas de archivos .conf:", Object.keys(listsWithContent));
  return listsWithContent;
}

// Función para combinar y ordenar listas según el orden establecido en banlistsOrder
function combineAndOrderLists(lflistContent, confContent1, confContent2, banlistsOrder) {
  let finalLists = [];

  // Recorrer el orden especificado en banlistsOrder y añadir las listas que existan
  Object.values(banlistsOrder).forEach(listName => {
    const listKey = `!${listName}`;
    if (lflistContent[listKey]) {
      finalLists.push({ name: listKey, content: lflistContent[listKey] });
    } else if (confContent1[listKey]) {
      finalLists.push({ name: listKey, content: confContent1[listKey] });
    } else if (confContent2[listKey]) {
      finalLists.push({ name: listKey, content: confContent2[listKey] });
    }
  });

  console.log("Listas combinadas y ordenadas:", finalLists.map(list => list.name));
  return finalLists;
}

// Función para generar la segunda línea con los ítems del objeto `banlistsOrder`
function generateSecondLineFromBanlistsOrder() {
  const items = Object.values(banlistsOrder).map(item => `[${item}]`).join('');
  return `#${items}`;
}

// Función para escribir el archivo final lflist.conf con la lista del objeto `banlistsOrder`
function writeFinalLflist(finalLists) {
  const filePath = path.join('scripts', LFLIST_FILE);
  let fileContent = '# Listas Generadas según el orden establecido\n';

  // Generar la segunda línea con los ítems en el orden del objeto
  const secondLine = generateSecondLineFromBanlistsOrder();
  fileContent += secondLine + '\n';

  // Añadir las listas en el mismo orden del objeto
  finalLists.forEach(list => {
    fileContent += `${list.name}\n`;
    list.content.forEach(line => {
      fileContent += `${line}\n`;
    });
  });

  fs.writeFileSync(filePath, fileContent);
  console.log(`Archivo final lflist.conf creado con las listas ordenadas y segunda línea generada: ${secondLine}`);
}

// Función para verificar si hay cambios antes de hacer commit
function hasChanges() {
  const status = execSync('git status --porcelain').toString();
  return status.trim().length > 0;
}

// Función para mover y hacer push al repositorio de destino
function moveAndPush() {
  execSync(`mv scripts/${LFLIST_FILE} koishi-Iflist-clients/`);
  process.chdir('koishi-Iflist-clients');
  execSync('git config user.name "GitHub Action"');
  execSync('git config user.email "action@github.com"');

  if (hasChanges()) {
    execSync(`git add ${LFLIST_FILE}`);
    execSync('git commit -m "Update lflist.conf with the latest changes"');
    execSync('git pull --rebase origin main');  // Asegurarse de que no haya conflictos
    execSync('git push origin main');
    console.log('Cambios subidos al repositorio.');
  } else {
    console.log('No hay cambios para subir.');
  }
}

// Main
function main() {
  // Clonar repositorios
  cloneRepo('https://github.com/fallenstardust/YGOMobile-cn-ko-en', 'repo-koishi');
  cloneRepo('https://github.com/termitaklk/lflist', 'comparison-repo');
  cloneRepo('https://github.com/ProjectIgnis/LFLists', 'ignis-lflist'); // Clonar el nuevo repositorio

  // Leer el archivo lflist.conf con su contenido
  const lflistContent = readLflistWithContent(path.join('repo-koishi', 'mobile', 'assets', 'data', 'conf', LFLIST_FILE));

  // Leer los archivos .conf con su contenido
  const confContent1 = readConfFilesWithContent('comparison-repo');
  const confContent2 = readConfFilesWithContent('ignis-lflist');

// Combinar y ordenar las listas de ambos repositorios
const finalLists = combineAndOrderLists(lflistContent, confContent1, confContent2, banlistsOrder);

  // Escribir el archivo final lflist.conf
  writeFinalLflist(finalLists);

  // Clonar el repositorio de destino, mover el archivo y hacer push
  cloneRepo(DEST_REPO_URL, 'koishi-Iflist-clients');
  moveAndPush();
}

main(); // Inicia el proceso



































