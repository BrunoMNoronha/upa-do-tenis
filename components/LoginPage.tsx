
import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (fileContent: string) => boolean; // Updated prop to accept file content
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'application/json') {
        setError('Por favor, selecione um arquivo JSON válido (.json).');
        setSelectedFile(null);
        setFileName('');
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
      setError('');
    } else {
      setSelectedFile(null);
      setFileName('');
      setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    if (!selectedFile) {
      setError('Por favor, selecione seu arquivo de licença.');
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      try {
        if (reader.result) {
          const isAuthenticated = onLogin(reader.result as string);
          if (!isAuthenticated) {
            setError('Arquivo de licença inválido ou corrompido. Verifique o conteúdo.');
          }
          // If isAuthenticated is true, App.tsx will handle the state change and redirect.
        } else {
          setError('Não foi possível ler o conteúdo do arquivo.');
        }
      } catch (parseError) {
        setError('Erro ao processar o arquivo de licença. Certifique-se de que é um JSON válido.');
        console.error("Parse error during license validation:", parseError);
      }
    };

    reader.onerror = () => {
      setError('Erro ao carregar o arquivo. Verifique as permissões.');
    };

    reader.readAsText(selectedFile);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight text-primary mb-2">UPA do Tênis</h1>
          <p className="text-lg text-gray-600">Acesse sua plataforma com seu arquivo de licença</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="licenseFile" className="block text-sm font-semibold text-gray-700 mb-2">
              Arquivo de Licença <span className="text-gray-500 text-xs">(license.json)</span>
            </label>
            <div className="flex items-center space-x-3">
              <label htmlFor="licenseFile" className="cursor-pointer bg-primary-light text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary transition-all shadow-sm">
                Escolher Arquivo
              </label>
              <input
                type="file"
                id="licenseFile"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Selecionar arquivo de licença JSON"
              />
              <span className="text-gray-600 text-sm truncate flex-1" aria-live="polite">
                {fileName || 'Nenhum arquivo selecionado'}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-danger/10 text-danger p-3 rounded-xl text-sm" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-primary-light text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-primary-light/30 hover:bg-primary transition-all uppercase tracking-wide"
            aria-label="Botão para validar a licença e entrar na plataforma"
          >
            Validar Licença e Entrar
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8">
          Sistema de Gestão v1.0.0 (MVP) &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
