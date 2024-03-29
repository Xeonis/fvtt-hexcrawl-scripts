//количество ячеек сетки
//количество ячеек сетки
let mapSizeL = 37; //ширина
let mapSizeH = 47; //высота

let mapOffsetL = 24; // смещение сетки ширина в гексах
let mapOffsetH = 20.04; // смещение сетки высота в гексах

let gridSizeModifyerL = 0; ////смещение нулевой линии по ширине, px
let gridSizeModifyerH = 0; //смещение нулевой линии по высоте, px

let reverse = true // смена длинны на ширину при установке тайлов
let firstLine = true;

//особые гексы (можно записать как свойство определенного гекса)
let borderLimits = 3; //Количество тайлов от границы для спавна мест помеченных как "limited"
let closerLimits = 4; //Количество тайлов от ближайшего "limited" в радиусе
let aditionalTags = []// Дополнительные теги отбора устанавливаемых тайлов // должны быть присущи всем!

//заполняет все однотипно чтобы упростить отладку параметров
const debug = false
// isTile - пустые места игнорировать или ставить заполнитель
// defaulTileName - название тайла в таггере для 

let mapTiles = {
    "empty"           : {min: 0, max: 67, default:true, isTile: true, defaulTileName: "waves_auto"},//65%
    "isle"                  : {min: 68, max: 77,},//10%
    "island"                : {min: 78, max: 80,},//3%
    "spoiled"               : {min: 81, max: 90},//10%
    "reefs"                 : {min: 91, max: 92},//2%
    "flats"                 : {min: 93, max: 94},//2%
    "rust"                  : {min: 95, max: 96},//2%
    "zongs"                 : {min: 97, max: 98},//2%
    "creeps"                : {min: 99, max: 100},//2%
}



const DiceRoll = `1d${Object.values(mapTiles).sort((a, b) => b.max - a.max)[0].max}`
const tilesName = Object.keys(mapTiles)
const tilesObject = Object.values(mapTiles)

//таблица всех кто имеет сателиты
const hashTableMainTilesIndexes = []; tilesObject.forEach((element,index) => {if (element?.sateliteHex) hashTableMainTilesIndexes.push(index)})

//стандартный тайл на который мы будем менять всех неугодных
const defaultIndex = tilesObject.findIndex(e => e?.default)






function fillInnHash(sizeL,sizeH) {
    return Array(sizeL).fill(Array(sizeH).fill(0).map((_,p)=> {return p}))
}

function removeha(hash = [],posl,posh) {
    hash.findIndex(e => e.l == posl && e.h == posh)
    return hash.filter(elem => elem != 1)
}

function removeFromHash(hash = [],posl,posh) {
    hash[posl][posh].val = 1;
    return hash.map(line=> line.filter(elem => elem != 1))
}

function randIntExcep(exp = []) {
    if (!exp.length) return undefined;
    return exp[Math.floor(Math.random() * exp.length)];
}

function onRadius (targetL,targetH,centerL,centerH,rad) {
    let distance = Math.max(
        Math.abs(centerL - targetL),
        Math.abs(centerH - targetH),
        Math.abs(centerL + centerH - targetL - targetH)
      );
    return distance <= radius;
} 
function getHexagonsInRadius(centerX, centerY, radius) {
    let hexagons = [];
  
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        if (Math.abs(x) + Math.abs(y) <= radius) {
          hexagons.push({ l: centerX + x, h: centerY + y });
        }
      }
    }
    return hexagons;
  }

function mapToLine (hash) {
    let flatmap = []
    let counter = 0;
    for (let posL = 0; posL < hash.length; posL++) {
        const line = hash[posL];
        for (let posH = 0; posH < line.length; posH++) {
            flatmap.push({
                counter,
                posL,
                posH,
                val: 0
            })
            counter += 1;
        }
    }
    return flatmap
}

function removeFromHashFlat(hash = [],counter) {
    hash[counter].val = 1;
    return hash.filter(elem=> elem?.val != 1)
}

function removeFromHashByRadonFlat (hash,poslM,poshM,rad) {
    let newHash = [...hash]
    let hexes = getHexagonsInRadius(poslM,poshM,rad)
    return newHash.filter(elem=> {
        let res = true;
        hexes.forEach((hex,ind)=> {
            if (hex.l == elem.posL && hex.h == elem.posH) {
                hexes.splice(ind, 1);
                res = false
            }
        })
        return res})
}

function removeBorder (hash =[],borderLimit) {
    const borderedStart = borderLimit
    const borderedH = mapSizeH-1-borderLimit;
    const borderedL = mapSizeL-1-borderLimit;

    const hashed = hash.map(el => {
       if((borderedH < el.posH) || (el.posH < borderedStart)) {el.val = 1}
       if((borderedL < el.posL) || (el.posH < borderedStart)) {el.val = 1}
    })
    return hashed.filter(elem=> elem?.val != 1)
}


function removeFromHashByRad (hash,poslM,poshM,rad) {
    let newHash = [...hash]

    for (let posL = 0; posL < hash.length; posL++) {
        const line = hash[posL];
        for (let posH = 0; posH < line.length; posH++) {
            if (onRadius(posL,posH,poslM,poshM,rad)) {
                newHash = removeFromHash(hash,posL,posH)
            }
        }
    }
    return newHash
}

function TileIsPlaced (posX,posY,listOftiles,gridSize) {
    for (let tile of listOftiles) {
        
        let x = tile.x; // x-coordinate of the tile
        let y = tile.y; // y-coordinate of the tile
        let XtilePlaced = x < posX + gridSize/2 && x > posX - gridSize/2
        let YtilePlaced = y < posY + gridSize/2 && y > posY - gridSize/2
        if (YtilePlaced && XtilePlaced) {return true}

    }   
    return false
}


void async function main () {
    try {
        ui.notifications.info("Заполнение карты в активной сцене начато. Ожидайте дальнейших уведомлений.");

        //заполняем матрицу наших тайлов
        let hashTableCount = { };
        let hashTableOfmainPlaced = [];
        let cells = (Array(mapSizeL).fill(Array(mapSizeH).fill(0))).map((arr,PosL) => {
            return arr.map((e,PosH) => {
                let rollValue = new Roll(DiceRoll).evaluate({async: false}).total
                let indexTile = tilesObject.findIndex((element) => {return (rollValue >= element.min && rollValue <= element.max) || defaultIndex})
                //игнорирую уже поставленные тайлы которых неможет быть чем заданное количество
                if (hashTableCount[indexTile]) {
                    if (hashTableCount[indexTile] >= tilesObject[indexTile].maxCount) {
                        return defaultIndex
                    }
                    hashTableCount[indexTile] += 1 
                }else{
                    hashTableCount[indexTile] = 1
                }
                //если у гекса может быть сателитный гекс
                if (tilesObject[indexTile]?.sateliteHex) {
                    //сгенерю их позицию позже 
                    //ролим
                    let rollAround = new Roll(tilesObject[indexTile]?.diceAroundHex || "0").evaluate({async: false}).total
                    //сохраняем для дальнейшего измененния карты
                    hashTableOfmainPlaced.push({rollAround,indexTile})
                    indexTile = defaultIndex;
                }
                return indexTile
            })
        });


        //собираю линейный вариант карты в виде хэш таблицы
        let HashMainPlace = mapToLine(fillInnHash(mapSizeL,mapSizeH))
        //перебираю гексы и заменяю некоторые на сателиты
        hashTableOfmainPlaced.forEach(item => {
            const tileId = item.indexTile;
            const tile = mapTiles[tileId];
            //удаляем из псевдо хэш таблицы все ячейки которые находятся на границе
            const borderLimit = (tile?.borderLimit)? tile.borderLimit : borderLimits;
            const curWorkHash = (tile?.limited)?  removeBorder(HashMainPlace,borderLimit) : HashMainPlace

            const closerLimit = (tile?.closerLimit)? tile.closerLimit : closerLimits;
            //получаем случайное положение по хэш таблице
            const elem = randIntExcep(curWorkHash)
            if (!elem) return;// больше места не нашлось
            const PosL = elem.posL
            const PosH = elem.posH
            //удаляем из хэш таблицы значения которые находятся в радиусе запрета
            HashMainPlace = removeFromHashByRadonFlat(HashMainPlace,elem.PosL,elem.PosH,closerLimit)

            //добавляем тайл в общую карту
            cells[PosL][PosH] = item.indexTile



            //проверю ближайшие чтобы не удалить один из "особых тайлов" случайно
            // в тупую не бейте ногами ок?
            let allplacetiles = []
            if (tile?.anothersatelites) {
                tile.anothersatelites.forEach(el => {
                    allplacetiles.push({dice: new Roll(el.dice || "0").evaluate({async: false}).total, hex: el.hex})
                })
            }

            let rollAround = item.rollAround
            let basicIndex = item.indexTile
            let sateliteHex = tilesObject[basicIndex].sateliteHex;

            
            allplacetiles.push({dice: rollAround, hex: sateliteHex})
            let counttiles = 0;
            allplacetiles.forEach(el => counttiles += el.ra)
            //получим ид ближайших гексов для сателитов
            let satelitepos = getHexagonsInRadius(PosL,PosH,1)
            let more = []
            if (counttiles > 6) {
                more = getHexagonsInRadius(PosL,PosH,2)
                more = more.filter(elem=> {
                    let res = true;
                    satelitepos.forEach((hex,ind)=> {
                        if (hex.l == elem.posL && hex.h == elem.posH) {
                            res = false
                        }
                    })
                })
            }
            //уберем один тайл для прохода
            let input = satelitepos[Math.floor(Math.random() * satelitepos.length)]
            satelitepos[Math.floor(Math.random() * satelitepos.length)].val = 1
            satelitepos = satelitepos.filter(elem=> elem?.val != 1)
            satelitepos = satelitepos.concat(more)
            allplacetiles.forEach((el,pos) => {
                for (let c = 0; c < el.dice; c++) {
                    let he = randIntExcep(satelitepos)
                    if (he.l == PosL && PosH == he.h) {
                        satelitepos = removeha(satelitepos,he.l,he.h)
                        he = randIntExcep(satelitepos)
                    }
                    satelitepos = removeha(satelitepos,he.l,he.h)
                    cells[he.l][he.h] = el.hex
                }
            })
            //



        })



        cells = cells.map((arr) =>arr.map((e) => { 
            return (debug)? tilesName[2] : (Number.isInteger(e))? tilesName[e] : e;
        }))

        console.log(cells);
        // Получение данных сцены напрямую, без использования .data
        let currentScene = game.scenes.current;
        let sceneGrid = currentScene.grid
        let gridSize = sceneGrid.size;
        // Размеры сцены
        let sceneWidth = currentScene.width;
        let sceneHeight = currentScene.height;
        // Расчет количества гексов

        let hexesAcross = Math.ceil(sceneWidth / gridSize);
        let hexesDown = Math.ceil(sceneHeight / (gridSize * 0.75)); // 0.75 - корректировка для вертикального расстояния между гексами


        let mapOffsetPixelsL = gridSize * mapOffsetL; // смещение сетки ширина в гексах
        let mapOffsetPixelsHEven = gridSize*0.5 + mapOffsetH*gridSize; // смещение сетки ширина в гексах
        let mapOffsetPixelsHNon = mapOffsetH * gridSize; // смещение сетки высота в гексах


        function even_or_odd(number) {
            return number % 2 === 0 ? true : false;
        }

        gridSizeL = gridSize + gridSizeModifyerL
        gridSizeH = gridSize + gridSizeModifyerH


        let sceneTiles = currentScene.tiles;

        let newTiles = []

        for (let posL = 0; posL < cells.length; posL++) {
            mapOffsetPixelsH =  (even_or_odd(posL))? mapOffsetPixelsHEven :  mapOffsetPixelsHNon
            for (let posH = 0; posH < cells[posL].length; posH++) {
                
                let localTileName = cells[posL][posH]
                if (localTileName == tilesName[defaultIndex]) {
                    if (mapTiles[tilesName[defaultIndex]]?.isTile != true) {
                        continue;
                    }else{
                        localTileName = mapTiles[tilesName[defaultIndex]].defaulTileName
                    }
                }

                let originalTile = Tagger.getByTag([localTileName,...aditionalTags])[0] 
                let newTile = originalTile.clone().toJSON();

                let X = (even_or_odd(posH))?    gridSizeL * mapOffsetL + gridSizeL*posL           : gridSizeL * mapOffsetL + gridSizeL*0.5 + gridSizeL*posL;
                let Y = (even_or_odd(posH))?    gridSizeH * mapOffsetH*Math.sqrt(3)/2  + gridSizeH*posH*Math.sqrt(3)/2 : gridSizeH * mapOffsetH*Math.sqrt(3)/2 + (gridSizeH*Math.sqrt(3)/2)*posH;
                newTile.x = (reverse)? X : Y;
                newTile.y = (reverse)? Y : X;
                if (TileIsPlaced(newTile.x,newTile.y,sceneTiles,gridSize)) {
                    continue;
                }else{
                    newTile.flags.tagger.tags.push(...["mapTile", "canBeDeleted"])
                    newTiles.push(newTile)
                }
            }
        }
        
        await currentScene.createEmbeddedDocuments("Tile", newTiles)

        ui.notifications.info("Заполнение карты завершено")


    } catch (error) {
        ui.notifications.error("что то пошло не так :(")
        console.log(error);
        return 0
    }
    

    
    
} ()
