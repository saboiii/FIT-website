import React, { useEffect, useMemo, useCallback, startTransition, useRef } from 'react'
import saveAs from 'file-saver'
import { Leva, useControls, button, levaStore } from 'leva'
import useStore from '@/utils/store'
import Viewer from './viewer'
import QuotePanel from './QuotePanel'
import { useToast } from '@/components/General/ToastProvider'
import { useState } from 'react'

const whiteTheme = {
  colors: {
    elevation1: '#fcfcfc',
    elevation2: '#e6e6e6',
    elevation3: '#eeeeee',
    highlight1: '#aaaaaa',
    highlight2: '#333333',
    highlight3: '#666666',
    accent1: '#ffffff',
    accent2: '#aaaaaa',
    accent3: '#666666',
    folder: '#666666',
    toolTip: '#000000',
  },
  fonts: { mono: 'Montserrat' },
}

const Result = () => {
  const { fileName, scene, buffers, generateScene, orderId, productId, variantId, geometryMetrics } = useStore()
  const { showToast } = useToast()
  const [meshNames, setMeshNames] = useState([])
  const [submittingConfig, setSubmittingConfig] = useState(false)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [advancedMode, setAdvancedMode] = useState(false)

  const defaultPrintability = {
    layerHeight: 0.2, initialLayerHeight: 0.2, wallLoops: 2,
    internalSolidInfillPattern: 'Rectilinear', sparseInfillDensity: 20,
    sparseInfillPattern: 'Rectilinear', nozzleDiameter: 0.4,
    enableSupport: false, supportType: 'Normal', printPlate: 'Textured',
  }
  const defaultVisual = {
    background: '#e3e3e3', wireframe: false, materialType: 'plastic',
  }
  const defaultLighting = {
    autoRotate: true, lightIntensity: 1, preset: 'rembrandt', environment: 'city',
  }

  const printPresets = {
    'Draft (Fast)': { layerHeight: 0.3, initialLayerHeight: 0.3, sparseInfillDensity: 10, wallLoops: 1, enableSupport: false },
    'Standard': { layerHeight: 0.2, initialLayerHeight: 0.2, sparseInfillDensity: 20, wallLoops: 2, enableSupport: false },
    'High Quality': { layerHeight: 0.12, initialLayerHeight: 0.12, sparseInfillDensity: 25, wallLoops: 3, enableSupport: false },
    'Strong & Durable': { layerHeight: 0.2, initialLayerHeight: 0.2, sparseInfillDensity: 40, wallLoops: 4, enableSupport: true },
  }

  const predefinedColors = [
    { name: 'White', hex: '#ffffff' },
    { name: 'Black', hex: '#000000' },
    { name: 'Red', hex: '#ff0000' },
    { name: 'Blue', hex: '#0055ff' },
    { name: 'Green', hex: '#00aa00' },
    { name: 'Yellow', hex: '#ffdd00' },
    { name: 'Orange', hex: '#ff6600' },
    { name: 'Purple', hex: '#8800cc' },
  ]

  // Refs to store current values for submission
  const currentPrintabilityRef = useRef({})
  const currentVisualRef = useRef({})
  const currentLightingRef = useRef({})

  // Reset configLoaded when productId or variantId changes
  useEffect(() => {
    setConfigLoaded(false)
  }, [productId, variantId])

  // Collect mesh names when scene changes
  useEffect(() => {
    if (!scene) return
    const names = []
    scene.traverse((obj) => {
      if (obj.isMesh && obj.name) {
        names.push(obj.name)
      }
    })
    setMeshNames(names)
  }, [scene])

  // Load existing configuration from MongoDB when productId is available
  useEffect(() => {
    if (!productId) {
      setConfigLoaded(true)
      return
    }

    if (configLoaded) return

    const loadConfigFromDB = async () => {
      try {
        const requestId = variantId // variantId is the requestId for custom prints
        const response = await fetch(`/api/custom-print?requestId=${requestId}`)

        if (response.ok) {
          const data = await response.json()
        }
      } catch (e) {
        console.error('Failed to load configuration from MongoDB:', e)
      } finally {
        setConfigLoaded(true)
      }
    }

    loadConfigFromDB()
  }, [productId, variantId, configLoaded])

  // Leva controls for visual config, including mesh colors
  const [visualConfig, setVisualConfig] = useControls('visual', () => {
    const controls = {
      background: '#e3e3e3',
      wireframe: false,
      materialType: {
        value: 'plastic',
        options: ['plastic', 'resin', 'metal', 'sandstone'],
      },
    }

    meshNames.forEach((name) => {
      controls[name] = { value: '#ffffff', label: `${name}` }
    })

    return controls
  }, { collapsed: true }, [meshNames])


  const [lighting] = useControls('lighting', () => ({
    autoRotate: true,
    lightIntensity: {
      value: 1,
      min: 0,
      max: 2,
      step: 0.1
    },
    preset: {
      value: 'rembrandt',
      options: ['rembrandt', 'portrait', 'upfront', 'soft'],
    },
    environment: {
      value: 'city',
      options: [
        'sunset', 'dawn', 'night', 'warehouse', 'forest',
        'apartment', 'studio', 'city', 'park', 'lobby',
      ],
    },
  }), { collapsed: true })

  const [printability, setPrintability] = useControls('printability', () => ({
    // Layer Height
    layerHeight: {
      value: 0.2,
      min: 0.1,
      max: 0.4,
      step: 0.01,
      label: 'Layer height (mm)'
    },
    initialLayerHeight: {
      value: 0.2,
      min: 0.1,
      max: 0.4,
      step: 0.01,
      label: 'Initial layer height (mm)'
    },
    // Walls
    wallLoops: {
      value: 2,
      min: 1,
      max: 4,
      step: 1,
      label: 'Wall loops'
    },
    internalSolidInfillPattern: {
      value: 'Rectilinear',
      options: [
        'Rectilinear',
        'Concentric',
        'Monotonic',
        'Monotonic line',
        'Aligned Rectilinear',
      ],
      label: 'Internal solid infill pattern',
    },
    // Sparse Infill
    sparseInfillDensity: {
      value: 20,
      min: 5,
      max: 40,
      step: 1,
      label: 'Sparse infill density (%)'
    },
    sparseInfillPattern: {
      value: 'Rectilinear',
      options: [
        'Rectilinear',
        'Grid',
        'HoneyComb',
        'Triangles',
        'Lightning',
        'Concentric',
        'Aligned Rectilinear',
      ],
      label: 'Sparse infill pattern',
    },
    nozzleDiameter: {
      value: 0.4,
      options: [0.2, 0.4, 0.6, 0.8],
      label: 'Nozzle diameter (mm)',
    },
    // Support
    enableSupport: {
      value: false,
      label: 'Enable support'
    },
    supportType: {
      value: 'Normal',
      options: ['Tree', 'Normal'],
      label: 'Support type',
    },
    // Print plate
    printPlate: {
      value: 'Textured',
      options: ['Textured', 'Smooth'],
      label: 'Print plate',
    },
  }), { collapsed: true })  // Update refs whenever control values change
  useEffect(() => {
    currentPrintabilityRef.current = printability
  }, [printability])

  useEffect(() => {
    currentVisualRef.current = visualConfig
  }, [visualConfig])

  useEffect(() => {
    currentLightingRef.current = lighting
  }, [lighting])

  // Map the editor's print controls to the Instant Quoting Engine's settings shape.
  const quoteSettings = useMemo(() => ({
    materialType: visualConfig.materialType,
    infillPercent: printability.sparseInfillDensity,
    wallLoops: printability.wallLoops,
    nozzleMm: printability.nozzleDiameter,
    layerHeightMm: printability.layerHeight,
    enableSupport: printability.enableSupport,
  }), [
    visualConfig.materialType,
    printability.sparseInfillDensity,
    printability.wallLoops,
    printability.nozzleDiameter,
    printability.layerHeight,
    printability.enableSupport,
  ])

  const downloadImage = useCallback(async () => {
    try {
      showToast('Preparing image...', 'info')
      const canvas = document.querySelector('canvas')
      if (!canvas) throw new Error('No canvas found.')
      const image = canvas
        .toDataURL('image/png')
        .replace('image/png', 'image/octet-stream')
      saveAs(image, `${fileName?.split('.')[0] || 'render'}.png`)
      showToast('Downloaded!', 'success')
    } catch (error) {
      showToast('Failed to download image: ' + error.message, 'error')
    }
  }, [fileName, showToast])

  // Submit configuration for print order or save to MongoDB
  const submitConfiguration = useCallback(async () => {
    setSubmittingConfig(true)
    try {
      // Get current values from refs (most up-to-date)
      const currentPrintability = currentPrintabilityRef.current
      const currentVisual = currentVisualRef.current
      const currentLighting = currentLightingRef.current

      // Extract only mesh colors (not background, wireframe, materialType)
      const meshColors = {}
      meshNames.forEach(name => {
        if (currentVisual[name] && currentVisual[name] !== '#ffffff') {
          meshColors[name] = currentVisual[name]
        }
      })

      const configurationData = {
        printSettings: {
          layerHeight: currentPrintability.layerHeight,
          initialLayerHeight: currentPrintability.initialLayerHeight,
          materialType: currentVisual.materialType,
          wallLoops: currentPrintability.wallLoops,
          internalSolidInfillPattern: currentPrintability.internalSolidInfillPattern,
          sparseInfillDensity: currentPrintability.sparseInfillDensity,
          sparseInfillPattern: currentPrintability.sparseInfillPattern,
          nozzleDiameter: currentPrintability.nozzleDiameter,
          enableSupport: currentPrintability.enableSupport,
          supportType: currentPrintability.supportType,
          printPlate: currentPrintability.printPlate,
        },
        meshColors: meshColors,
      }

      if (orderId) {
        // Handle direct print order submission
        const response = await fetch(`/api/user/print-order/${orderId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            configuration: configurationData,
          }),
        })

        if (response.ok) {
          showToast('Print configuration submitted successfully!', 'success')
          setTimeout(() => {
            window.location.href = '/account'
          }, 1500)
        } else {
          throw new Error('Failed to submit configuration')
        }
      } else if (productId) {
        // Save custom print configuration to MongoDB
        const requestId = variantId // variantId is the requestId for custom prints
        const response = await fetch('/api/custom-print/config', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId,
            ...configurationData,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to save configuration')
        }

        showToast('Print configuration saved successfully!', 'success')
        setTimeout(() => {
          window.location.href = '/cart'
        }, 1500)
      }
    } catch (error) {
      console.error('Error submitting configuration:', error)
      showToast('Failed to save configuration. Please try again.', 'error')
    } finally {
      setSubmittingConfig(false)
    }
  }, [meshNames, orderId, productId, variantId, showToast])

  // Add save configuration button in export controls
  const saveConfigControls = useMemo(() => {
    const controls = {
      'Reset All Settings': button(() => {
        levaStore.set({
          'visual.background': defaultVisual.background,
          'visual.wireframe': defaultVisual.wireframe,
          'visual.materialType': defaultVisual.materialType,
          'lighting.autoRotate': defaultLighting.autoRotate,
          'lighting.lightIntensity': defaultLighting.lightIntensity,
          'lighting.preset': defaultLighting.preset,
          'lighting.environment': defaultLighting.environment,
          ...Object.fromEntries(
            Object.entries(defaultPrintability).map(([k, v]) => [`printability.${k}`, v])
          ),
          ...Object.fromEntries(meshNames.map(name => [`visual.${name}`, '#ffffff'])),
        }, false)
      }),
      'Download image': button(() => downloadImage()),
    }

    // Always show save button if we have a scene (for custom prints or orders)
    if (orderId || productId || variantId) {
      const buttonText = orderId ? 'Submit Print Configuration' : 'Save Print Config'
      controls[buttonText] = button(() => submitConfiguration(), { disabled: submittingConfig })
    }

    return controls
  }, [orderId, productId, variantId, submittingConfig, downloadImage, submitConfiguration, meshNames])

  useControls('export', saveConfigControls, { collapsed: false })

  // Update refs whenever control values change
  useEffect(() => {
    currentPrintabilityRef.current = printability
  }, [printability])

  useEffect(() => {
    if (!buffers || !fileName) return
    startTransition(() => {
      Promise.resolve(
        generateScene({
          ...visualConfig,
          ...lighting,
          ...printability,
        })
      ).catch((e) => {
        console.error('Failed to generate scene:', e)
        showToast(e?.message ? `Failed to load model: ${e.message}` : 'Failed to load model', 'error')
      })
    })
    // Only regenerate when the underlying model changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffers, fileName, productId, variantId])

  return (
    <div className="h-full w-screen">
      {!scene ? (
        <div className="w-screen h-screen flex justify-center items-center">
          <div className="loader" />
        </div>
      ) : (
        <div className="grid grid-cols-5 h-full">
          <section className="h-full w-full col-span-5">
            {scene && (
              <Viewer
                {...visualConfig}
                {...printability}
                environment={lighting.environment}
                preset={lighting.preset}
                intensity={lighting.lightIntensity}
                autoRotate={lighting.autoRotate}
                materialType={visualConfig.materialType}
                meshColors={Object.fromEntries(meshNames.map(name => [name, visualConfig[name]]).filter(([name, color]) => color))}
              />
            )}
          </section>
        </div>
      )}
      <Leva theme={whiteTheme} hidden={!advancedMode} />
      {scene && <QuotePanel metrics={geometryMetrics} settings={quoteSettings} />}
      {/* Simple/Advanced mode toggle */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
        <button
          onClick={() => setAdvancedMode(!advancedMode)}
          className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
        >
          {advancedMode ? 'Simple Mode' : 'Advanced Mode'}
        </button>
        {!advancedMode && (
          <div className="flex flex-col gap-1 bg-white border border-gray-200 rounded shadow-sm p-2 w-48">
            <span className="text-[10px] font-semibold uppercase text-gray-500 px-1">Print Presets</span>
            {Object.entries(printPresets).map(([name, values]) => (
              <button
                key={name}
                onClick={() => {
                  levaStore.set(
                    Object.fromEntries(
                      Object.entries(values).map(([k, v]) => [`printability.${k}`, v])
                    ), false
                  )
                }}
                className="text-xs text-left px-2 py-1.5 rounded hover:bg-gray-100"
              >
                {name}
              </button>
            ))}
            {meshNames.length > 0 && (
              <>
                <span className="text-[10px] font-semibold uppercase text-gray-500 px-1 mt-2">Colors</span>
                <div className="flex flex-wrap gap-1.5 px-1">
                  {predefinedColors.map(({ name: colorName, hex }) => (
                    <button
                      key={hex}
                      title={colorName}
                      onClick={() => {
                        levaStore.set(
                          Object.fromEntries(meshNames.map(n => [`visual.${n}`, hex])), false
                        )
                      }}
                      className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Result
