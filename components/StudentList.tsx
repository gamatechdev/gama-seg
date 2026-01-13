import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Aluno, Unidade, Procedimento } from '../types';
import { Card, Button, Input, Select, GlassHeader, Toggle } from './UI';
import { Plus, Search, User, Building, Phone, BadgeCheck, ShieldAlert, GraduationCap, Save, FileText, Mail, Lock, UserPlus, Calendar, Clock, DollarSign } from 'lucide-react';

export const StudentList: React.FC = () => {
  const [students, setStudents] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Aluno | null>(null);

  // Form Data
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  
  // Create Form
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    contato: '',
    empresa: '',
    createUser: false,
    email: ''
  });

  // Edit/Add Training Form State
  const [editTab, setEditTab] = useState<'details' | 'training'>('details');
  const [editFormData, setEditFormData] = useState<Partial<Aluno>>({});
  const [procedimentosTreinamento, setProcedimentosTreinamento] = useState<Procedimento[]>([]);
  
  // Quick Add Training State
  const [quickTraining, setQuickTraining] = useState({
    treinamento: '',
    data_realizacao: new Date().toISOString().split('T')[0],
    modelo: 'Presencial',
    horario: '08:00',
    valor: 0
  });

  // Helper to map training name to API tags (Accent Insensitive)
  const detectTrainingTag = (name: string): string => {
    // Normalize to remove accents: 'Direção' -> 'direcao'
    const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // DD - Direção Defensiva
    // Checks for "direcao" AND "defensiva" together or separate keywords strongly associated
    if (n.includes('direcao') && n.includes('defensiva')) return 'dd';
    if (n.includes('defensiva')) return 'dd';
    
    // PS - Primeiros Socorros
    if (n.includes('primeiros') && n.includes('socorros')) return 'ps';
    if (n.includes('socorros')) return 'ps';
    
    // NRs
    if (n.includes('nr06') || n.includes('nr 06') || n.includes('nr-06') || n.includes('epi')) return 'nr06';
    if (n.includes('nr11') || n.includes('nr 11') || n.includes('empilhadeira') || n.includes('transporte')) return 'nr11';
    if (n.includes('nr12') || n.includes('nr 12') || n.includes('maquinas')) return 'nr12';
    if (n.includes('nr17') || n.includes('nr 17') || n.includes('ergonomia')) return 'nr17';
    if (n.includes('nr18') || n.includes('nr 18') || n.includes('construcao')) return 'nr18';
    if (n.includes('nr20') || n.includes('nr 20') || n.includes('inflamaveis')) return 'nr20';
    if (n.includes('nr23') || n.includes('nr 23') || n.includes('incendio')) return 'nr23';
    if (n.includes('nr26') || n.includes('nr 26') || n.includes('sinalizacao')) return 'nr26';
    if (n.includes('nr35') || n.includes('nr 35') || n.includes('altura')) return 'nr35';
    
    return ''; // Unknown tag - will be filtered out
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aluno')
        .select(`
          *,
          unidades:empresa (id, nome_unidade)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setStudents(data as unknown as Aluno[]);

      const { data: uniData } = await supabase.from('unidades').select('id, nome_unidade');
      if (uniData) setUnidades(uniData);

      // Fetch procedures - REMOVED strictly idcategoria filter here to ensure we get all candidates
      // then filter in memory for robustness (matching TrainingList logic)
      const { data: procData } = await supabase.from('procedimento').select('id, nome, idcategoria');
      if (procData) {
        // Filter only supported trainings or specific IDs
        const supported = procData.filter(p => {
            if (p.id === 417) return true; // Explicitly allow NR 06 (ID 417)
            if (p.id === 428) return true; // Explicitly allow NR 17 (ID 428)

            if (p.idcategoria !== 46) return false;
            return detectTrainingTag(p.nome) !== '';
        });
        setProcedimentosTreinamento(supported);
      }

    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
        setEditFormData({
            nome: selectedStudent.nome,
            cpf: selectedStudent.cpf,
            contato: selectedStudent.contato,
            empresa: selectedStudent.empresa
        });
        setEditTab('details');
        setQuickTraining({
            treinamento: '',
            data_realizacao: new Date().toISOString().split('T')[0],
            modelo: 'Presencial',
            horario: '08:00',
            valor: 0
        });
    }
  }, [selectedStudent]);

  const handleCreate = async () => {
    try {
      if (!formData.nome || !formData.cpf || !formData.empresa) return alert("Preencha os campos obrigatórios");

      const { data: studentData, error: studentError } = await supabase.from('aluno').insert({
        nome: formData.nome,
        cpf: formData.cpf,
        contato: formData.contato,
        empresa: parseInt(formData.empresa)
      }).select().single();

      if (studentError) throw studentError;

      if (formData.createUser && formData.email && studentData) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: 'Gama1234',
          options: {
            data: { name: formData.nome }
          }
        });

        if (authError) {
          alert("Aluno criado, mas erro ao criar usuário: " + authError.message);
        } else if (authData.user) {
          await supabase.from('aluno').update({ user_id: authData.user.id }).eq('id', studentData.id);
        }
      }

      setShowCreateModal(false);
      setFormData({ nome: '', cpf: '', contato: '', empresa: '', createUser: false, email: '' });
      fetchData();
    } catch (error: any) {
      alert("Erro ao criar aluno: " + error.message);
    }
  };

  const handleUpdateStudent = async () => {
      if (!selectedStudent) return;
      try {
          const { error } = await supabase.from('aluno').update({
              nome: editFormData.nome,
              cpf: editFormData.cpf,
              contato: editFormData.contato,
              empresa: editFormData.empresa
          }).eq('id', selectedStudent.id);

          if (error) throw error;
          alert("Dados atualizados!");
          setSelectedStudent(null);
          fetchData();
      } catch (err: any) {
          alert("Erro ao atualizar: " + err.message);
      }
  };

  const handleAddTrainingFromStudent = async () => {
      if (!selectedStudent || !quickTraining.treinamento) return alert("Selecione o treinamento");
      
      try {
          const { error } = await supabase.from('treinamentos').insert({
              aluno: selectedStudent.id,
              treinamento: parseInt(quickTraining.treinamento),
              data_realizacao: quickTraining.data_realizacao,
              horario: quickTraining.horario,
              modelo: quickTraining.modelo,
              valor: quickTraining.valor,
              participou: true,
              certificado_enviado: false
          });

          if (error) throw error;
          alert("Treinamento adicionado com sucesso!");
          setQuickTraining(prev => ({...prev, treinamento: '', valor: 0}));
      } catch (err: any) {
          alert("Erro ao adicionar treinamento: " + err.message);
      }
  }

  const filteredStudents = students.filter(s => 
    s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.cpf.includes(searchTerm) ||
    s.unidades?.nome_unidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pb-10">
      <GlassHeader 
        title="Gestão de Alunos" 
        actions={
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus size={18} strokeWidth={2.5} />
            <span>Novo Aluno</span>
          </Button>
        }
      />

      <div className="px-8">
        <div className="relative mb-8 max-w-md">
            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder="Buscar por nome, CPF ou empresa..." 
                className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl shadow-sm border-none focus:ring-2 focus:ring-ios-blue outline-none transition-shadow"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {loading ? (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ios-blue"></div>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
                {filteredStudents.map(student => (
                    <div key={student.id} onClick={() => setSelectedStudent(student)} className="cursor-pointer group">
                        <Card className="hover:-translate-y-1 hover:shadow-ios-float transition-all duration-300 h-full flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2.5 rounded-2xl ${student.user_id ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    <User size={20} strokeWidth={2.5} />
                                </div>
                                {student.user_id ? (
                                    <div className="bg-green-50 text-green-700 p-1.5 rounded-lg" title="Usuário Ativo">
                                        <BadgeCheck size={18} />
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 text-gray-400 p-1.5 rounded-lg" title="Sem Acesso">
                                        <ShieldAlert size={18} />
                                    </div>
                                )}
                            </div>

                            <h3 className="font-bold text-lg text-gray-900 mb-0.5 truncate">{student.nome}</h3>
                            <p className="text-sm text-gray-400 font-medium mb-auto tracking-wide">{student.cpf}</p>

                            <div className="pt-4 mt-4 border-t border-gray-100 space-y-2.5">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Building size={16} className="text-gray-400" />
                                    <span className="truncate font-medium">{student.unidades?.nome_unidade || 'Sem empresa'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone size={16} className="text-gray-400" />
                                    <span className="truncate">{student.contato || 'Sem contato'}</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                ))}
            </div>
        )}
      </div>

       {/* Create Modal */}
       {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
            <Card className="w-full max-w-lg overflow-hidden animate-scale-in p-0 shadow-2xl">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-xl">
                    <h2 className="text-xl font-bold text-gray-900">Novo Aluno</h2>
                    <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>
                
                <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
                    <Input 
                        label="Nome Completo" 
                        icon={<User size={18} />}
                        value={formData.nome}
                        onChange={e => setFormData({...formData, nome: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="CPF" 
                            icon={<FileText size={18} />}
                            value={formData.cpf}
                            onChange={e => setFormData({...formData, cpf: e.target.value})}
                        />
                         <Input 
                            label="Contato" 
                            icon={<Phone size={18} />}
                            value={formData.contato}
                            onChange={e => setFormData({...formData, contato: e.target.value})}
                        />
                    </div>
                    
                    <Select 
                        label="Empresa"
                        icon={<Building size={18} />}
                        value={formData.empresa}
                        onChange={e => setFormData({...formData, empresa: e.target.value})}
                    >
                        <option value="">Selecione a empresa</option>
                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nome_unidade}</option>)}
                    </Select>

                    <div className="pt-4 border-t border-gray-100">
                        <Toggle 
                            label="Gerar Acesso ao Sistema"
                            description="Criar um usuário com senha padrão (Gama1234)."
                            checked={formData.createUser}
                            onChange={(val) => setFormData({...formData, createUser: val})}
                        />
                        
                        {formData.createUser && (
                            <div className="mt-4 animate-fade-in pl-2 border-l-2 border-ios-blue ml-2">
                                <Input 
                                    label="E-mail de Login" 
                                    type="email"
                                    icon={<Mail size={18} />}
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    placeholder="usuario@empresa.com"
                                    className="bg-white"
                                />
                                <div className="flex items-center gap-2 text-xs text-blue-600 font-medium mt-2 bg-blue-50 p-2 rounded-lg">
                                    <Lock size={12} />
                                    Senha temporária: Gama1234
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 flex gap-3 bg-gray-50/50">
                    <Button variant="ghost" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                    <Button className="flex-1" onClick={handleCreate}>Salvar Aluno</Button>
                </div>
            </Card>
        </div>
      )}

      {/* Edit / Details Modal */}
      {selectedStudent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
            <Card className="w-full max-w-xl overflow-hidden animate-scale-in p-0 shadow-2xl">
                {/* Modal Header */}
                <div className="p-6 pb-0 bg-white">
                    <div className="flex justify-between items-start mb-6">
                         <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-gray-700 font-bold text-xl">
                                {selectedStudent.nome.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{selectedStudent.nome}</h2>
                                <p className="text-gray-500 text-sm font-medium">{selectedStudent.cpf}</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <span className="text-2xl">&times;</span>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-1 bg-gray-100/80 rounded-xl mb-6">
                        <button 
                            onClick={() => setEditTab('details')}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${editTab === 'details' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <User size={16} /> Dados
                        </button>
                        <button 
                            onClick={() => setEditTab('training')}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${editTab === 'training' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <GraduationCap size={16} /> + Treinamento
                        </button>
                    </div>
                </div>

                <div className="p-6 pt-0 bg-white min-h-[300px]">
                    {editTab === 'details' ? (
                        <div className="space-y-5 animate-fade-in">
                             <Input 
                                label="Nome Completo" 
                                icon={<User size={18} />}
                                value={editFormData.nome || ''}
                                onChange={e => setEditFormData({...editFormData, nome: e.target.value})}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="CPF" 
                                    icon={<FileText size={18} />}
                                    value={editFormData.cpf || ''}
                                    onChange={e => setEditFormData({...editFormData, cpf: e.target.value})}
                                />
                                <Input 
                                    label="Contato" 
                                    icon={<Phone size={18} />}
                                    value={editFormData.contato || ''}
                                    onChange={e => setEditFormData({...editFormData, contato: e.target.value})}
                                />
                            </div>
                            <Select 
                                label="Empresa"
                                icon={<Building size={18} />}
                                value={editFormData.empresa || ''}
                                onChange={e => setEditFormData({...editFormData, empresa: parseInt(e.target.value)})}
                            >
                                {unidades.map(u => <option key={u.id} value={u.id}>{u.nome_unidade}</option>)}
                            </Select>
                            
                            <div className="mt-8 pt-4 border-t border-gray-100">
                                <Button onClick={handleUpdateStudent} className="w-full flex justify-center items-center gap-2">
                                    <Save size={18} /> Salvar Alterações
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-fade-in">
                            <div className="p-4 bg-purple-50 rounded-2xl mb-4 border border-purple-100 flex items-center gap-3">
                                <div className="p-2 bg-white rounded-full text-purple-600 shadow-sm">
                                    <UserPlus size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-purple-900">Adicionar Novo Treinamento</p>
                                    <p className="text-xs text-purple-700">O aluno será matriculado imediatamente.</p>
                                </div>
                            </div>

                            <Select 
                                label="Treinamento"
                                icon={<GraduationCap size={18} />}
                                value={quickTraining.treinamento}
                                onChange={e => setQuickTraining({...quickTraining, treinamento: e.target.value})}
                            >
                                <option value="">Selecione o treinamento</option>
                                {procedimentosTreinamento.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                            </Select>

                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="Data" 
                                    type="date"
                                    value={quickTraining.data_realizacao}
                                    onChange={e => setQuickTraining({...quickTraining, data_realizacao: e.target.value})}
                                />
                                <Input 
                                    label="Horário" 
                                    type="time"
                                    icon={<Clock size={18} />}
                                    value={quickTraining.horario}
                                    onChange={e => setQuickTraining({...quickTraining, horario: e.target.value})}
                                />
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <Select 
                                    label="Modelo"
                                    value={quickTraining.modelo}
                                    onChange={e => setQuickTraining({...quickTraining, modelo: e.target.value})}
                                >
                                    <option value="Presencial">Presencial</option>
                                    <option value="EAD">EAD</option>
                                    <option value="Hibrido">Híbrido</option>
                                </Select>
                                <Input 
                                    label="Valor (R$)" 
                                    type="number"
                                    icon={<DollarSign size={16} />}
                                    value={quickTraining.valor}
                                    onChange={e => setQuickTraining({...quickTraining, valor: parseFloat(e.target.value)})}
                                />
                             </div>
                             
                             <div className="mt-8 pt-4 border-t border-gray-100">
                                <Button onClick={handleAddTrainingFromStudent} className="w-full bg-purple-600 hover:bg-purple-700 shadow-purple-500/30">
                                    Adicionar Treinamento
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
          </div>
      )}
    </div>
  );
};