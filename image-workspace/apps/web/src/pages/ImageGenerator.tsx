import { useState } from 'react'
import { BatchResultGrid } from '@/components/feature/BatchResultGrid'
import { Header } from '@/components/feature/Header'
import { ImageHistory } from '@/components/feature/ImageHistory'
import { ImageResultCard } from '@/components/feature/ImageResultCard'
import { OnboardingGuide } from '@/components/feature/OnboardingGuide'
import { PromptCard } from '@/components/feature/PromptCard'
import { SettingsModal } from '@/components/feature/SettingsModal'
import { StatusCard } from '@/components/feature/StatusCard'
import { useImageGenerator } from '@/hooks/useImageGenerator'

export default function ImageGenerator() {
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('zenith-onboarding-completed') !== 'true'
  })

  const closeGuide = () => {
    window.localStorage.setItem('zenith-onboarding-completed', 'true')
    setShowGuide(false)
  }
  const {
    currentToken,
    provider,
    model,
    relaySettings,
    generationMode,
    referenceImages,
    batchPromptMode,
    batchCount,
    batchPrompts,
    batchTasks,
    batchDownloading,
    prompt,
    negativePrompt,
    width,
    height,
    steps,
    loading,
    imageDetails,
    status,
    elapsed,
    selectedRatio,
    uhd,
    showInfo,
    isBlurred,
    isOptimizing,
    isTranslating,
    llmSettings,
    setModel,
    setRelaySettings,
    setGenerationMode,
    handleReferenceImages,
    setBatchPromptMode,
    setBatchCount,
    setBatchPrompts,
    setPrompt,
    setNegativePrompt,
    setWidth,
    setHeight,
    setSteps,
    setShowInfo,
    setIsBlurred,
    setLLMProvider,
    setLLMModel,
    setTranslateProvider,
    setTranslateModel,
    setAutoTranslate,
    setCustomSystemPrompt,
    setCustomOptimizeConfig,
    setCustomTranslateConfig,
    saveToken,
    handleRatioSelect,
    handleUhdToggle,
    handleDownload,
    handleDelete,
    handleGenerate,
    cancelBatch,
    retryBatchTask,
    downloadBatchTask,
    downloadBatchAsZip,
    clearBatchResults,
    handleLoadFromHistory,
    handleOptimize,
    handleTranslate,
    historyId,
    generatedAt,
  } = useImageGenerator()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Header
            onSettingsClick={() => setShowSettings(true)}
            onHistoryClick={() => setShowHistory(true)}
            onHelpClick={() => setShowGuide(true)}
            hasToken={!!currentToken}
          />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Panel - Controls */}
            <div className="lg:col-span-3 space-y-4">
              <PromptCard
                prompt={prompt}
                negativePrompt={negativePrompt}
                steps={steps}
                width={width}
                height={height}
                selectedRatio={selectedRatio}
                uhd={uhd}
                loading={loading}
                setPrompt={setPrompt}
                setNegativePrompt={setNegativePrompt}
                setSteps={setSteps}
                setWidth={setWidth}
                setHeight={setHeight}
                handleRatioSelect={handleRatioSelect}
                handleUhdToggle={handleUhdToggle}
                handleGenerate={handleGenerate}
                onOptimize={handleOptimize}
                onTranslate={handleTranslate}
                isOptimizing={isOptimizing}
                isTranslating={isTranslating}
                isCustomProvider={provider === 'custom'}
                generationMode={generationMode}
                referenceImages={referenceImages}
                setGenerationMode={setGenerationMode}
                onReferenceImagesChange={handleReferenceImages}
                batchPromptMode={batchPromptMode}
                batchCount={batchCount}
                batchPrompts={batchPrompts}
                setBatchPromptMode={setBatchPromptMode}
                setBatchCount={setBatchCount}
                setBatchPrompts={setBatchPrompts}
              />
            </div>

            {/* Right Panel - Output */}
            <div className="lg:col-span-2 space-y-4">
              {generationMode === 'batch' ? (
                <BatchResultGrid
                  tasks={batchTasks}
                  loading={loading}
                  downloading={batchDownloading}
                  onCancel={cancelBatch}
                  onRetry={retryBatchTask}
                  onDownload={downloadBatchTask}
                  onDownloadAll={downloadBatchAsZip}
                  onClear={clearBatchResults}
                />
              ) : (
                <ImageResultCard
                  imageDetails={imageDetails}
                  loading={loading}
                  elapsed={elapsed}
                  showInfo={showInfo}
                  isBlurred={isBlurred}
                  setShowInfo={setShowInfo}
                  setIsBlurred={setIsBlurred}
                  handleDownload={handleDownload}
                  handleDelete={handleDelete}
                  onRegenerate={handleGenerate}
                  historyId={historyId}
                  generatedAt={generatedAt}
                />
              )}

              <StatusCard status={status} />
            </div>
          </div>
        </div>
      </div>

      <ImageHistory
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={handleLoadFromHistory}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        provider={provider}
        model={model}
        currentToken={currentToken}
        relaySettings={relaySettings}
        setModel={setModel}
        setRelaySettings={setRelaySettings}
        saveToken={saveToken}
        llmSettings={llmSettings}
        setLLMProvider={setLLMProvider}
        setLLMModel={setLLMModel}
        setTranslateProvider={setTranslateProvider}
        setTranslateModel={setTranslateModel}
        setAutoTranslate={setAutoTranslate}
        setCustomSystemPrompt={setCustomSystemPrompt}
        setCustomOptimizeConfig={setCustomOptimizeConfig}
        setCustomTranslateConfig={setCustomTranslateConfig}
      />

      <OnboardingGuide open={showGuide} onClose={closeGuide} />
    </div>
  )
}
