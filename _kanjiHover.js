var body = document.getElementById('kanjiHover');
if (body) body = body.innerHTML;

var kanji = new Set();
var kanjiDict = {};

if (body) {
  appendCSS();
  appendHoverDiv();
  findKanji();
  getKanjiData().then(() => {
    let kanjiTargets = document.getElementsByClassName("kanjiHoverTarget");
    Array.from(kanjiTargets).forEach(function (element) {
      element.addEventListener('mouseenter', onKanjiHover);
      element.addEventListener('mouseleave', onKanjiUnhover);
    });
  });
}

function appendHoverDiv() {
  var hoverDiv = document.createElement('div');
  hoverDiv.classList.add("hoverDiv");
  document.body.appendChild(hoverDiv);
}

function findKanji() {
  const regex = /([\u4E00-\u9FAF])(?![^<]*>)/g;
  const matches = body.matchAll(regex);
  for (const match of matches) {
    kanji.add(match[1]);
  }

  body = body.replace(regex, (match) => `<span class="kanjiHoverTarget">${match}</span>`);
  document.getElementById('kanjiHover').innerHTML = body;
}

async function getKanjiData() {
  const primaryUrlBase = "https://kanji-api-theta.vercel.app/kanji/";
  const fallbackUrlBase = "https://kanjiapi.dev/v1/kanji/";
  const localUrlBase = "http://localhost:3000/kanji/"; // ✅ Nueva URL local

  kanji = [...kanji]; // Convert Set to Array
  let kanjiArr = await Promise.all(
    kanji.map(async character => {
      try {
        let res;
        let data;
        let urls = [
          `${primaryUrlBase}${character}`,
          `${fallbackUrlBase}${character}`,
          `${localUrlBase}${character}` // ✅ Tercer intento
        ];

        for (let url of urls) {
          try {
            res = await fetch(url);
            if (res.ok) {
              data = await res.json();
              break;
            }
          } catch (err) {
            console.warn(`Error consultando ${url}:`, err);
          }
        }

        if (!data) {
          throw new Error(`Kanji '${character}' no encontrado en ninguna fuente.`);
        }

        return data;

      } catch (error) {
        console.error(error);
        return { kanji: character, error: "Not found" };
      }
    })
  );

  // Poblar diccionario
  for (let item of kanjiArr) {
    if (item && item.kanji && !item.error) {
      kanjiDict[item.kanji] = buildString(item);
    }
  }
}


function onKanjiHover(event) {
  let hoverDiv = document.getElementsByClassName("hoverDiv")[0];
  let content = kanjiDict[event.target.innerHTML];
  if (content) {
    hoverDiv.innerHTML = content;
    hoverDiv.style.display = "block";
  }
}

function onKanjiUnhover(event) {
  let hoverDiv = document.getElementsByClassName("hoverDiv")[0];
  hoverDiv.innerHTML = "";
  hoverDiv.style.display = "none";
}

function injectKanjiHTML() {
  var str = document.getElementById("kanjiHover").innerHTML;
  var re = new RegExp(Object.keys(kanjiDict).join("|"), "gi");
  str = str.replace(re, function (matched) {
    if (kanjiDict[matched])
      return buildString(kanjiDict[matched]);
    return matched;
  });
  document.getElementById("kanjiHover").innerHTML = str;
}

function buildString(kanjiData) {
  let s = '<span class="hoverText">Kanji:</span> ' + kanjiData.kanji + '<br>';

  if (kanjiData.grade)
    s += '<span class="hoverText">Grade:</span> ' + kanjiData.grade + '<br>';

  s += '<span class="hoverText">Meaning:</span> ';
  if (kanjiData.meanings && kanjiData.meanings.length > 0)
    s += kanjiData.meanings.join(', ');
  else if (kanjiData.heisig_en)
    s += kanjiData.heisig_en;
  else
    s += 'Unknown';
  s += '<br>';

  if (kanjiData.kun_readings && kanjiData.kun_readings.length > 0) {
    s += `<span class="hoverText">Kun'yomi:</span> ${kanjiData.kun_readings.join(', ')}<br>`;
  }

  if (kanjiData.on_readings && kanjiData.on_readings.length > 0) {
    s += `<span class="hoverText">On'yomi:</span> ${kanjiData.on_readings.join(', ')}<br>`;
  }

  return s;
}

function appendCSS() {
  var styleSheet = document.createElement('style');
  styleSheet.innerHTML = `
  .hoverDiv {
    position: absolute;
    width: 30vw;
    background-color: #1E1A1E;
    color: #fff;
    text-align: center;
    padding: 5px 0;
    border-radius: 6px;
    z-index: 1;
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 18px;
    writing-mode: horizontal-tb;
  }
  
  .hoverText {
    color: #e95464;
  }

  @media only screen and (max-width: 768px) {
      .hoverDiv {width: 90vw;}
  } 
  `;
  document.head.appendChild(styleSheet);
}
