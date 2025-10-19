import React, { useState, useCallback, ChangeEvent } from 'react';
import { editImageWithPrompt } from './services/geminiService';

// --- Helper Components ---

const Spinner: React.FC = () => (
  <svg
    className="animate-spin h-8 w-8 text-blue-400"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
    </svg>
);

const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
);

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, isLoading }) => {
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImageUpload(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onImageUpload(e.dataTransfer.files[0]);
        }
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center p-4">
             <label
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-slate-700 rounded-2xl cursor-pointer bg-slate-800/50 hover:bg-slate-800/80 hover:border-blue-500 transition-all duration-300"
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <UploadIcon className="w-12 h-12 mb-4 text-slate-500" />
                    <p className="mb-2 text-xl text-slate-400"><span className="font-semibold text-slate-300">Clique para enviar</span> ou arraste e solte</p>
                    <p className="text-sm text-slate-500">PNG, JPG, WEBP (MÁX. 20MB)</p>
                </div>
                <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isLoading} />
            </label>
        </div>
    );
};

// --- Main Application Component ---

const App: React.FC = () => {
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = useCallback((file: File) => {
    if (file) {
      if (file.size > 20 * 1024 * 1024) { // 20MB in bytes
        setError("O arquivo é muito grande. O tamanho máximo permitido é 20MB.");
        return;
      }
      setOriginalImageFile(file);
      setOriginalImageUrl(URL.createObjectURL(file));
      setEditedImageUrl(null);
      setError(null);
      setPrompt('');
    }
  }, []);
  
  const fileToGenerativePart = async (file: File): Promise<{ mimeType: string; data: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const data = result.split(',')[1];
        if (!data) {
          reject(new Error("Não foi possível ler os dados do arquivo."));
          return;
        }
        resolve({
          mimeType: file.type,
          data: data,
        });
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt || !originalImageFile) {
      setError("Por favor, forneça uma imagem e um comando.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setEditedImageUrl(null);

    try {
        const imageParts = await fileToGenerativePart(originalImageFile);
        const resultUrl = await editImageWithPrompt(imageParts.data, imageParts.mimeType, prompt);
        setEditedImageUrl(resultUrl);
    } catch (err: any) {
        setError(err.message || "Ocorreu um erro desconhecido.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleReset = () => {
      setOriginalImageFile(null);
      setOriginalImageUrl(null);
      setEditedImageUrl(null);
      setPrompt('');
      setError(null);
      setIsLoading(false);
  };

  return (
    <div className="bg-transparent text-white min-h-screen antialiased">
      <main className="container mx-auto p-4 lg:p-8">
        <header className="text-center mb-12 pb-8 border-b border-slate-700/60">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            Editor de IA Nano Banana
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Dê vida às suas fotos. Envie uma imagem, descreva uma edição e deixe a IA fazer a mágica.
          </p>
        </header>

        {!originalImageUrl ? (
          <>
            <ImageUploader onImageUpload={handleImageUpload} isLoading={isLoading} />
            {error && (
                <div className="mt-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-lg flex items-center gap-4 max-w-3xl mx-auto w-full" role="alert">
                    <ErrorIcon className="w-6 h-6 flex-shrink-0" />
                    <div>
                        <strong className="font-bold">Erro: </strong>
                        <span className="block sm:inline ml-1">{error}</span>
                    </div>
                </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Original Image */}
              <div className="flex flex-col items-center">
                  <h2 className="text-2xl font-semibold mb-4 text-slate-300">Antes</h2>
                  <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-800/50 shadow-2xl shadow-black/30 ring-1 ring-slate-700 flex items-center justify-center">
                      <img src={originalImageUrl} alt="Original" className="w-full h-full object-contain" />
                  </div>
              </div>
              {/* Edited Image */}
              <div className="flex flex-col items-center">
                  <h2 className="text-2xl font-semibold mb-4 text-slate-300">Depois</h2>
                  <div className={`w-full aspect-square rounded-2xl overflow-hidden bg-slate-800/50 shadow-2xl shadow-black/30 ring-1 ring-slate-700 flex items-center justify-center transition-all duration-500 ${isLoading ? 'ring-blue-500/50 ring-2' : ''}`}>
                      {isLoading ? (
                          <div className="flex flex-col items-center gap-4 text-slate-400">
                              <Spinner />
                              <span>Processando pixels...</span>
                          </div>
                      ) : editedImageUrl ? (
                          <img src={editedImageUrl} alt="Editada" className="w-full h-full object-contain animate-fade-in" />
                      ) : (
                          <div className="text-slate-500 text-center p-4">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-4 opacity-20">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                              </svg>
                              Sua imagem editada aparecerá aqui.
                          </div>
                      )}
                  </div>
              </div>
            </div>
            
            {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-lg flex items-center gap-4 max-w-3xl mx-auto w-full" role="alert">
                    <ErrorIcon className="w-6 h-6 flex-shrink-0" />
                    <div>
                        <strong className="font-bold">Erro: </strong>
                        <span className="block sm:inline ml-1">{error}</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-3xl mx-auto w-full pt-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="ex: 'adicione um dragão majestoso voando no céu' ou 'transforme isso em uma cidade cyberpunk à noite'"
                className="w-full p-4 rounded-lg bg-slate-800 border border-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition-colors duration-300 resize-none text-white placeholder-slate-500 text-lg"
                rows={3}
                disabled={isLoading}
              />
              <div className="flex items-center justify-center gap-4 mt-2">
                <button
                    type="button"
                    onClick={handleReset}
                    className="px-8 py-3 rounded-lg bg-transparent border border-slate-600 text-slate-300 font-semibold hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
                    disabled={isLoading}
                >
                    Começar de Novo
                </button>
                <button
                    type="submit"
                    className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/10 hover:shadow-xl hover:shadow-purple-600/20 transform hover:-translate-y-0.5"
                    disabled={isLoading || !prompt}
                >
                    {isLoading ? 'Gerando...' : '✨ Gerar'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
