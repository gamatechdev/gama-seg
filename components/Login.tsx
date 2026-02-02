import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Button, Card, Input } from './UI';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // Auth state change will be caught in App.tsx
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F2F2F7]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-400/20 rounded-full blur-[100px]" />
      </div>

      <Card className="w-full max-w-md relative z-10 backdrop-blur-3xl bg-white/80 border border-white/50 shadow-2xl">
        <div className="text-center mb-10 mt-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-ios-blue to-purple-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-blue-500/30">
                G
            </div>
            <h1 className="text-2xl font-bold text-gray-900">GAMA Center</h1>
            <p className="text-gray-500 mt-2">Faça login para acessar o sistema</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100 text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <Input 
                placeholder="seu@email.com" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white"
            />
            <Input 
                placeholder="Senha" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white"
            />
          </div>

          <Button type="submit" className="w-full py-4 text-lg shadow-xl shadow-blue-500/20" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        
        <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">Sistema de Gestão de Segurança • v1.0</p>
        </div>
      </Card>
    </div>
  );
};
