var body = document.getElementById('kanjiHover')
if (body) body = body.innerHTML
var kanji = new Set()
var kanjiDict = {}

if (body) {
  appendCSS()
  appendHoverDiv()
  findKanji()
  getKanjiData().then(r => {
    let kanjiTargets = document.getElementsByClassName("kanjiHoverTarget")
    Array.from(kanjiTargets).forEach(function (element) {
      element.addEventListener('mouseenter', onKanjiHover)
      element.addEventListener('mouseleave', onKanjiUnhover)
    });
  })
}

function appendHoverDiv() {
  var hoverDiv = document.createElement('div')
  hoverDiv.classList.add("hoverDiv")
  document.body.appendChild(hoverDiv)
}

function findKanji() {
  const regex = /([\u4E00-\u9FAF])(?![^<]*>|[^<>]*<\/g)/g
  const matches = body.matchAll(regex)
  for (const match of matches) {
    kanji.add(...match)
  }

  body = body.replace(regex, (match) => `<span class="kanjiHoverTarget">${match}</span>`)
  document.getElementById('kanjiHover').innerHTML = body;
}

async function getKanjiData() {
  const primaryUrlBase = "https://raw.githubusercontent.com/robincajas12/kanji-api/refs/heads/main/kanjis/";
  const fallbackUrlBase = "https://kanjiapi.dev/v1/kanji/";

  kanji = [...kanji]; // Convert Set to Array
  let kanjiArr = await Promise.all(
    kanji.map(async character => {
      try {
        // 1. Try fetching from GitHub first
        const primaryUrl = `${primaryUrlBase}${character}.json`;
        let res = await fetch(primaryUrl);

        if (!res.ok) {
          // 2. If GitHub fails (e.g., 404), try the fallback API
          const fallbackUrl = `${fallbackUrlBase}${character}`;
          res = await fetch(fallbackUrl);
        }

        // If the second fetch also fails, this will throw and be caught.
        if (!res.ok) {
            throw new Error(`Kanji '${character}' not found in either source.`);
        }
        
        return res.json();

      } catch (error) {
        console.error(error);
        // Return a null or an error object so Promise.all doesn't fail completely
        return { kanji: character, error: "Not found" }; 
      }
    })
  );

  // Populate dictionary with kanji as key, filtering out any that failed
  for (let item of kanjiArr) {
    if (item && !item.error) {
        kanjiDict[item["kanji"]] = buildString(item);
    }
  }
}

function onKanjiHover(event) {
  let hoverDiv = document.getElementsByClassName("hoverDiv")[0]
  hoverDiv.innerHTML = kanjiDict[event.target.innerHTML]
  hoverDiv.style.display = "block"
}

function onKanjiUnhover(event) {
  let hoverDiv = document.getElementsByClassName("hoverDiv")[0]
  hoverDiv.innerHtml = ""
  hoverDiv.style.display = "none"
}

function injectKanjiHTML() {
  var str = document.getElementById("kanjiHover").innerHTML

  var re = new RegExp(Object.keys(kanjiDict).join("|"), "gi");
  str = str.replace(re, function (matched) {
    if (kanjiDict[matched])
      return buildString(matched)

    return matched
  });

  document.getElementById("kanjiHover").innerHTML = str
}

function buildString(kanjiData) {
  let s = '<span class="hoverText">Kanji:</span> ' + kanjiData.kanji + '<br>'
  if (kanjiData.grade)
    s += '<span class="hoverText">Grade:</span> ' + kanjiData.grade + '<br>'
  s += '<span class="hoverText">Meaning:</span> '
  for (let str of kanjiData.meanings) {
    s += str + ', '
  }

  s = s.slice(0, -2)
  s += '<br>'

  if (kanjiData.kun_readings.length > 0) {
    s += '<span class="hoverText">Kun\'yomi:</span> '
    for (let str of kanjiData.kun_readings) {
      s += str + ', '
    }
    s = s.slice(0, -2)
    s += '<br>'
  }

  if (kanjiData.on_readings.length > 0) {
    s += '<span class="hoverText">On\'yomi:</span> '
    for (let str of kanjiData.on_readings) {
      s += str + ', '
    }
    s = s.slice(0, -2)
    s += '<br>'
  }

  s += '</span>'

  return s
}
// cual es el cuerpo de kanjiData? 
function appendCSS() {
  var styleSheet = document.createElement('style')
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
    -webkit-transform: translate(-50%, -50%);
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
  `
  document.head.appendChild(styleSheet)
}
