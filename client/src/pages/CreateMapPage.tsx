
import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { userDataContext } from '../contexts/UserDataContext'
import { Button, Modal, Form } from 'react-bootstrap'
import Draggable from 'react-draggable'
import MapsPage from './MapsPage'
import axios from 'axios'

export default function CreateMapPage() {

  const mapName = useRef("myMap")
  const mapUrl = "../world2.png"
  const mapOffsetX: any = useRef()
  const mapOffsetY: any = useRef()

  const mapScale: any = useRef(1)
  const mapScaleProperties: any = useRef({
    step: 1.1, min: 0.5, max: 5
  })
  const drawBorderProperties: any = useRef({
    startPointColor: 'yellow',
    borderLineColor: 'red',
    connectingLineColor: 'yellow',
    borderShapeStrokeColor: 'cyan',
    borderShapeFillColor: 'rgba(251, 192, 147, 0.3)'
  })
  const formProperties: any = useRef({
    countryNameCharsLimit: [3, 50]
  })
  const modalProperties: any = useRef({
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
    borderColor: '#282929'
  })
  const canvasRef: any = useRef(null)
  const requestIdRef: any = useRef()
  const mousePos: any = useRef([0, 0])
  const isDragging: any = useRef<boolean>(false)
  const mapRef: any = useRef<HTMLImageElement>(new Image())
  //debugging coordds for rendering, TB removed
  const [coords, setCoords] = useState<number[]>([])
  const [mouseCoords, setMouseCoords] = useState<any>([0, 0])
  //
  const borders: any = useRef<number[]>([])
  const drawBorderHelperPos: any = useRef<number[]>([])
  const isDrawingBorder: any = useRef<boolean>(false)
  const [mapLoading, setMapLoading] = useState<boolean>(false)
  const [saveBordersModalShow, setSaveBordersModalShow] = useState<boolean>(false)
  const [bordersModalError, setBordersModalError] = useState(null)
  const [isBorderSaveSuccess, setIsBorderSaveSuccess] = useState<boolean>(false)
  const [loadingBorderSave, setLoadingBorderSave] = useState<boolean>(false)
  //
  const existingBorders = useRef<any[]>([])
  const [bordersLoadingData, setBordersLoadingData] = useState<any[]>([])
  const [loadingExistingBorders, setLoadingExistingBorders] = useState<boolean>(false)
  const [countryName, setCountryName] = useState<string>("")
  const [loading, error, user] = useContext(userDataContext)

  const handleCountryNameChange = (e: any) => {
    setCountryName(e.target.value)
  }
  const getCountriesByName = async (cName?: any) => {
    let params = (cName !== undefined) ? { name: cName, mapName: mapName.current } : { mapName: mapName.current }
    return await axios.get(
      `${process.env.REACT_APP_SERVER_URL}:${process.env.REACT_APP_SERVER_PORT}/countryGet`,
      {
        params,
        withCredentials: true
      }
    )
  }

  const handleBordersSave = (name?: any) => {
    setLoadingBorderSave(true)
    let cName = (name === undefined) ? countryName : name
    axios.post(`${process.env.REACT_APP_SERVER_URL}:${process.env.REACT_APP_SERVER_PORT}/borderUpload`,
      {
        points: [...borders.current, borders.current[0]],
        countryName: cName,
        mapName: mapName.current
      }, { withCredentials: true })
      .then((res) => {

        borders.current = []
        drawBorderHelperPos.current = []
        isDrawingBorder.current = false
        setIsBorderSaveSuccess(true)
        loadCountryExistingBorders(cName)
      })
      .catch(err => setBordersModalError(err.response.data.message))
      .finally(() => setLoadingBorderSave(false))
  }

  const loadNaturalEarthBorders = async () => {

    drawBorderHelperPos.current = []
    isDrawingBorder.current = false
    drawMap(mapOffsetX.current, mapOffsetY.current)
    await axios.get(`${process.env.REACT_APP_SERVER_URL}:${process.env.REACT_APP_SERVER_PORT}/getNaturalEarthData`, {
      params: {},
      withCredentials: true
    }).then(async (res) => {
      for (let k = 0; k < res.data.length; k++) {
        borders.current = []
        for (let i = 0; i < res.data[k].coords.length; i++) {
          for (let j = 0; j < res.data[k].coords[i][0].length; j++) {
            let long = res.data[k].coords[i][0][j][0]
            let lat = res.data[k].coords[i][0][j][1]
            let x = mapRef.current.width * ((long + 180) / 360)
            let y = mapRef.current.height * ((lat - 90) / (-180))

            borders.current.push([x, y])
          }
          borders.current.pop()
          await handleBordersSave(res.data[k].NAME)
        }
      }
    })

  }

  const loadCountryExistingBorders = async (cName: any, cLength?: any) => {

    axios.get(`${process.env.REACT_APP_SERVER_URL}:${process.env.REACT_APP_SERVER_PORT}/bordersGet`, {
      params: {
        mapName: mapName.current,
        countryName: cName
      },
      withCredentials: true
    })
    .then(res => {
      let min = [res.data[0].pointX, res.data[0].pointY]
      let max = [res.data[0].pointX, res.data[0].pointY]
      for(let i = 1; i < res.data.length; i++)
      {
        if(res.data[i].pointX < min[0])
        {
          min[0] = res.data[i].pointX
        }
        if(res.data[i].pointY < min[1])
        {
          min[1] = res.data[i].pointY
        }
        if(res.data[i].pointX > max[0])
        {
          max[0] = res.data[i].pointX
        }
        if(res.data[i].pointY > max[1])
        {
          max[1] = res.data[i].pointY
        }
      }
      res.data.min = min
      res.data.max = max
      existingBorders.current.push(res.data)
      if(cLength !== undefined)
      {
        let percent = Math.round((existingBorders.current.length - 1) * 100 / cLength)
        setBordersLoadingData([percent, cName])
        if(percent >= 100)
        {
          setLoadingExistingBorders(false)
          addEventListeners()
        }
      }
      drawMap(mapOffsetX.current, mapOffsetY.current)
    })
  }

  const loadAllBorders = async () => {
    let countries = await getCountriesByName()
    setLoadingExistingBorders(true)
    unmountEventListeners()
    for (let i = 0; i < countries.data.length; i++) {
      loadCountryExistingBorders(countries.data[i].name, countries.data.length)
    }
    //setLoadingExistingBorders(false)
    //console.log(existingBorders.current)
  }

  useEffect(() => {
    mapRef.current.src = mapUrl
    addEventListeners()
    loadAllBorders()
    //loadNaturalEarthBorders()
    requestIdRef.current = requestAnimationFrame(tick);
    return () => {
      unmountEventListeners()
      cancelAnimationFrame(requestIdRef.current)
    };
  }, [])

  const addEventListeners = () => {
    mapRef.current.addEventListener('load', mapImageLoad)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('mousedown', mouseDown)
    window.addEventListener('mouseup', mouseUp)
    window.addEventListener('mousemove', mouseMove)
    window.addEventListener('wheel', mouseWheel, { passive: false })
  }

  const unmountEventListeners = () => {
    mapRef.current.removeEventListener('load', mapImageLoad)
    window.removeEventListener('keyup', keyUp)
    window.removeEventListener('mousedown', mouseDown)
    window.removeEventListener('mouseup', mouseUp)
    window.removeEventListener('mousemove', mouseMove)
    window.removeEventListener('wheel', mouseWheel)
  }

  const drawBorderStartPoint = (ctx: any, color: any) => {
    ctx.beginPath()
    ctx.fillStyle = color
    ctx.arc(drawBorderHelperPos.current[0][0], drawBorderHelperPos.current[0][1],
      (mapScaleProperties.current.max - mapScale.current) / 1.25, 0, 2 * Math.PI)

    ctx.fill()
    ctx.closePath()
  }
  const redrawMapWithCurrentBorders = () => {
    let ctx: any = canvasRef.current.getContext('2d')

    drawMap(mapOffsetX.current, mapOffsetY.current)
    if (!drawBorderHelperPos.current.length) return

    drawBorderStartPoint(ctx, drawBorderProperties.current.startPointColor)

    ctx.strokeStyle = drawBorderProperties.current.borderLineColor
    ctx.lineWidth = mapScaleProperties.current.max - mapScale.current
    ctx.beginPath()
    for (let i = 1; i < drawBorderHelperPos.current.length; i++) {
      ctx.moveTo(drawBorderHelperPos.current[i - 1][0], drawBorderHelperPos.current[i - 1][1])
      ctx.lineTo(drawBorderHelperPos.current[i][0], drawBorderHelperPos.current[i][1])
    }
    ctx.stroke()
  }

  const handleBordersModalOnClose = () => {
    redrawMapWithCurrentBorders()
    addEventListeners()
    setSaveBordersModalShow(false)
  }

  const keyUp = (e: any) => {
    // to turn the key combinations into a beautiful tool menu instead (TO:DoO)
    if (e.code == 'KeyD') {
      isDrawingBorder.current = !isDrawingBorder.current
      if (!isDrawingBorder.current) {
        drawMap(mapOffsetX.current, mapOffsetY.current)
        return
      }
      borders.current = []
      return
    }
    if (e.code == 'KeyZ') {
      if (!isDrawingBorder.current || !borders.current.length) {
        return
      }
      borders.current.pop()
      drawBorderHelperPos.current.pop()
      redrawMapWithCurrentBorders()
      return
    }

  }

  const mapImageLoad = () => {

    setMapLoading(true)
    updateMapOffset(mapRef.current.width / 2, 0)
    drawMap(mapRef.current.width / 2, 0)
  }

  const mouseDown = (e: any) => {

    if ((isDrawingBorder.current || !canvasRef.current)) return
    isDragging.current = true
    mousePos.current = getMousePos(e)
  }

  const mouseUp = (e: any) => {

    if (!canvasRef.current) return

    isDragging.current = false

    if (!isDrawingBorder.current) return

    mousePos.current = getMousePos(e)
    let rect = canvasRef.current.getBoundingClientRect();

    let coordX = (mapOffsetX.current * mapScale.current) % mapRef.current.width
    coordX < 0 && (coordX += mapRef.current.width)
    let trueMousePosition = [
      (mousePos.current[0] - rect.left) * mapScale.current + coordX,
      (mousePos.current[1] - rect.top) * mapScale.current + mapOffsetY.current * mapScale.current
    ]
    let ctx: any = canvasRef.current.getContext('2d')

    if (!borders.current.length) {
      drawBorderHelperPos.current = [[mousePos.current[0] - rect.left, mousePos.current[1] - rect.top]]

      drawBorderStartPoint(ctx, drawBorderProperties.current.startPointColor)
      borders.current.push(trueMousePosition)
      return
    }

    if (trueMousePosition[0] + mapScale.current * mapScaleProperties.current.max > borders.current[0][0] &&
      trueMousePosition[0] - mapScale.current * mapScaleProperties.current.max < borders.current[0][0] &&
      trueMousePosition[1] + mapScale.current * mapScaleProperties.current.max > borders.current[0][1] &&
      trueMousePosition[1] - mapScale.current * mapScaleProperties.current.max < borders.current[0][1]) {

      ctx.beginPath()
      ctx.strokeStyle = drawBorderProperties.current.connectingLineColor
      ctx.moveTo(
        drawBorderHelperPos.current[drawBorderHelperPos.current.length - 1][0],
        drawBorderHelperPos.current[drawBorderHelperPos.current.length - 1][1]
      )
      ctx.lineTo(drawBorderHelperPos.current[0][0], drawBorderHelperPos.current[0][1])
      ctx.lineWidth = (mapScaleProperties.current.max - mapScale.current)/2
      ctx.stroke()
      ctx.closePath()

      unmountEventListeners()
      setBordersModalError(null)
      setIsBorderSaveSuccess(false)
      setCountryName('')
      setSaveBordersModalShow(true)
      return
    }

    ctx.beginPath()
    ctx.strokeStyle = drawBorderProperties.current.borderLineColor
    ctx.moveTo(
      drawBorderHelperPos.current[drawBorderHelperPos.current.length - 1][0],
      drawBorderHelperPos.current[drawBorderHelperPos.current.length - 1][1]
    )
    ctx.lineTo(mousePos.current[0] - rect.left, mousePos.current[1] - rect.top)
    ctx.lineWidth = (mapScaleProperties.current.max - mapScale.current)/2
    ctx.stroke()
    ctx.closePath()
    borders.current.push(trueMousePosition)
    drawBorderHelperPos.current.push([mousePos.current[0] - rect.left, mousePos.current[1] - rect.top])
  }

  const mouseMove = (e: any) => {

    if ((!isDragging.current || !canvasRef.current)) return
    let newPos = getMousePos(e)
    updateMapOffset(mapOffsetX.current + (mousePos.current[0] - newPos[0]), mapOffsetY.current)

    let mouseOffsetY = (mousePos.current[1] - newPos[1])
    if (mapOffsetY.current + mouseOffsetY > 0 &&
      mapOffsetY.current + mouseOffsetY < (mapRef.current.height / mapScale.current - canvasRef.current.height)) {
      updateMapOffset(mapOffsetX.current, mapOffsetY.current + mouseOffsetY)
    }
    mousePos.current = newPos
    drawMap(mapOffsetX.current, mapOffsetY.current)

  }

  const mouseWheel = (e: any) => {
    e.preventDefault()
    e.stopPropagation()
    if (isDrawingBorder.current) return
    let scaleProperties = mapScaleProperties.current
    if (e.deltaY > 0) {
      if (mapScale.current * scaleProperties.step > scaleProperties.max || mapOffsetY.current >
        (mapRef.current.height / (mapScale.current * scaleProperties.step) - canvasRef.current.height)) {
        return
      }
      mapScale.current *= scaleProperties.step
      updateMapOffset(mapOffsetX.current / scaleProperties.step,
        mapOffsetY.current / scaleProperties.step)
      drawMap(mapOffsetX.current, mapOffsetY.current)
      return
    }
    if (mapScale.current / scaleProperties.step < scaleProperties.min) {
      return
    }
    mapScale.current /= scaleProperties.step
    updateMapOffset(mapOffsetX.current * scaleProperties.step,
      mapOffsetY.current * scaleProperties.step)
    drawMap(mapOffsetX.current, mapOffsetY.current)
  }

  const getMousePos = (e: any) => {
    let rect = canvasRef.current.getBoundingClientRect();
    setMouseCoords([
      (e.clientX - rect.left) * mapScale.current,
      (e.clientY - rect.top) * mapScale.current
    ])
    return [e.clientX, e.clientY]
  };

  const updateMapOffset = (offsetX: any, offsetY: any) => {
    mapOffsetX.current = offsetX
    mapOffsetY.current = offsetY
    let coordX = (offsetX * mapScale.current) % mapRef.current.width
    coordX < 0 && (coordX += mapRef.current.width)
    setCoords([coordX, offsetY * mapScale.current])
  }

  const drawMap: any = (offsetX: any, offsetY: any) => {
    if (!canvasRef.current || mapUrl == null) return

    canvasRef.current.width = window.innerWidth
    canvasRef.current.height = window.innerHeight
    let mapImage: any = mapRef.current

    let ctx: any = canvasRef.current.getContext('2d')
    if (offsetX * mapScale.current >= mapImage.width ||
      offsetX * mapScale.current <= -mapImage.width) offsetX %= mapImage.width / mapScale.current

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    ctx.drawImage(mapImage,
      offsetX * mapScale.current, offsetY * mapScale.current,
      (canvasRef.current.width - offsetX) * mapScale.current, canvasRef.current.height * mapScale.current,
      0, 0, (canvasRef.current.width - offsetX), canvasRef.current.height)

    ctx.drawImage(mapImage,
      canvasRef.current.width * mapScale.current, offsetY * mapScale.current,
      offsetX * mapScale.current, canvasRef.current.height * mapScale.current,
      (canvasRef.current.width - offsetX), 0, offsetX, canvasRef.current.height)

    if (offsetX > mapImage.width / mapScale.current - canvasRef.current.width) {
      ctx.drawImage(mapImage,
        0, offsetY * mapScale.current,
        offsetX * mapScale.current - mapImage.width + canvasRef.current.width * mapScale.current,
        canvasRef.current.height * mapScale.current,
        mapImage.width / mapScale.current - offsetX, 0,
        offsetX - mapImage.width / mapScale.current + canvasRef.current.width, canvasRef.current.height)
    }
    else if (offsetX < 0) {
      ctx.drawImage(mapImage,
        mapImage.width + offsetX * mapScale.current, offsetY * mapScale.current,
        -offsetX * mapScale.current, canvasRef.current.height * mapScale.current,
        0, 0, -offsetX, canvasRef.current.height)
    }
    if (existingBorders.current.length == 0) return

    let coordX = (offsetX * mapScale.current) % mapRef.current.width
    coordX < 0 && (coordX += mapRef.current.width)
    ctx.strokeStyle = drawBorderProperties.current.borderShapeStrokeColor
    ctx.fillStyle = drawBorderProperties.current.borderShapeFillColor
    ctx.lineWidth = (mapScaleProperties.current.max - mapScale.current)/2
    ctx.beginPath()
    for (let i = 0; i < existingBorders.current.length; i++) {
      ctx.moveTo((existingBorders.current[i][0].pointX - coordX) / mapScale.current,
        (existingBorders.current[i][0].pointY - offsetY * mapScale.current) / mapScale.current)
      if ( !(existingBorders.current[i].max[0] > coordX  && 
          existingBorders.current[i].min[0] < coordX + canvasRef.current.width*mapScale.current &&
          existingBorders.current[i].max[1] > offsetY*mapScale.current &&
          existingBorders.current[i].min[1] < offsetY*mapScale.current + canvasRef.current.height*mapScale.current))
      {
        continue
      }
      for (let j = 1; j < existingBorders.current[i].length; j++) {
        if (existingBorders.current[i][j].countryName != existingBorders.current[i][j - 1].countryName ||
          existingBorders.current[i][j].selection != existingBorders.current[i][j - 1].selection) {
            
          ctx.moveTo((existingBorders.current[i][j].pointX - coordX) / mapScale.current,
          (existingBorders.current[i][j].pointY - offsetY * mapScale.current) / mapScale.current)
          continue
        }
        ctx.lineTo((existingBorders.current[i][j].pointX - coordX) / mapScale.current,
          (existingBorders.current[i][j].pointY - offsetY * mapScale.current) / mapScale.current)
      }
    }
    ctx.stroke()
    ctx.fill()
    return
  }

  const tick = useCallback(() => {
    requestIdRef.current = requestAnimationFrame(tick)
  }, []);

  if (loading) return <>Loading user data</>
  if (!mapLoading) return <>Loading map image</>
  if (error) return <MapsPage />

  return (
    <div className="createMapPage">
      <p style={{ color: 'white', position: 'absolute', fontSize: '24px' }}>
        coords({`${coords[0]}, ${coords[1]}`}) --
        mouseCoords({`${mouseCoords[0]}, ${mouseCoords[1]}`}) --
        realClick({`${(mouseCoords[0] + coords[0]) % mapRef.current.width}, 
                    ${mouseCoords[1] + coords[1]}`}) --
        zoom({`${mapScale.current}`})
      </p>
      <canvas ref={canvasRef} id='canvas-id' />
      <Modal
        show={saveBordersModalShow}
        onHide={handleBordersModalOnClose}
        backdrop="static"
        keyboard={false}
      >
        <Draggable>
          {isBorderSaveSuccess || bordersModalError ?
            <div>
              <Modal.Header style={modalProperties.current}>
                <Modal.Title>
                  {bordersModalError ? bordersModalError : 'Succesfully saved borders!'}
                </Modal.Title>
                <Button className={'btn-close btn-close-white'}
                  style={{ marginLeft: '15px', marginTop: '10px', padding: 0 }}
                  onClick={handleBordersModalOnClose}
                ></Button>
              </Modal.Header>
            </div>
            :
            <div>
              <Modal.Header style={modalProperties.current}>
                <Modal.Title>Save currently connected borders</Modal.Title>
                <Button className={'btn-close btn-close-white'}
                  style={{ marginLeft: '15px', marginTop: '10px', padding: 0 }}
                  onClick={handleBordersModalOnClose}></Button>
              </Modal.Header>
              <Modal.Body style={modalProperties.current}>
                <Form.Group >
                  <Form.Label>
                    Enter a country name [alphabetic,&nbsp;
                    {formProperties.current.countryNameCharsLimit[0]} -&nbsp;
                    {formProperties.current.countryNameCharsLimit[1]} chars]
                  </Form.Label>
                  <Form.Control type="text" onChange={handleCountryNameChange}
                    value={countryName} placeholder="" />
                </Form.Group>
              </Modal.Body>
              <Modal.Footer style={modalProperties.current}>
                <Button variant="primary"
                  style={{ marginRight: '15px' }}
                  onClick={handleBordersSave}>Save borders</Button>
                <Button variant="secondary" onClick={handleBordersModalOnClose}>Cancel link</Button>
              </Modal.Footer>
            </div>
          }
        </Draggable>
      </Modal>

      <Modal
        show={loadingBorderSave}
        onHide={handleBordersModalOnClose}
        backdrop="static"
        keyboard={false}
      >
        <Draggable>
          <div>
            <Modal.Header style={modalProperties.current}>
              <Modal.Title>Saving borders, please wait..</Modal.Title>
            </Modal.Header>
          </div>
        </Draggable>
      </Modal>

      <Modal
        show={loadingExistingBorders}
        onHide={handleBordersModalOnClose}
        backdrop="static"
        keyboard={false}
      >
        <Draggable>
          <div>
            <Modal.Header style={modalProperties.current}>
              <Modal.Title>Loading borders - {bordersLoadingData[0]}%</Modal.Title>
            </Modal.Header>
            
            <Modal.Body style={modalProperties.current}>
              <p style={{margin: 0}}>{bordersLoadingData[1]}</p>
            </Modal.Body>
          </div>
        </Draggable>
      </Modal>
    </div>
  )
}