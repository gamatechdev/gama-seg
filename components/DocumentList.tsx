import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { DocSeg, MONTHS, Unidade, Procedimento } from '../types';
import { Card, Badge, Button, Input, Select, GlassHeader, Toggle } from './UI';
import { Plus, Search, Calendar, FileText as FileIcon, CheckCircle2, Send, Building2, DollarSign, Clock, AlertCircle } from 'lucide-react';

export const DocumentList: React.FC = () => {
  const [documents, setDocuments] = useState<DocSeg[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocSeg | null>(null);

  // Form Data
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  
  // Create Form State
  const [createData, setCreateData] = useState({
    empresa: '',
    doc: '',
    mes: new Date().getMonth() + 1,
    status: 'Pendente',
    data_recebimento: new Date().toISOString().split('T')[0],
    prazo: new Date().toISOString().split('T')[0],
    data_entrega: '',
    valor: 0
  });

  // Edit Form State
  const [editData, setEditData] = useState<Partial<DocSeg>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('doc_seg')
        .select(`
          *,
          unidades:empresa (id, nome_unidade),
          procedimento:doc (id, nome, idcategoria)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setDocuments(data as unknown as DocSeg[]);

      const { data: uniData } = await supabase.from('unidades').select('id, nome_unidade');
      const { data: procData } = await supabase.from('procedimento').select('id, nome, idcategoria');
      if (uniData) setUnidades(uniData);
      if (procData) setProcedimentos(procData);

    } catch (err) {
      console.error('Error fetching docs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDoc) {
      setEditData({
        status: selectedDoc.status,
        valor: selectedDoc.valor,
        data_recebimento: selectedDoc.data_recebimento,
        prazo: selectedDoc.prazo,
        data_entrega: selectedDoc.data_entrega,
        enviado: selectedDoc.enviado
      });
    }
  }, [selectedDoc]);

  const handleCreate = async () => {
    try {
      if (!createData.empresa || !createData.doc) return alert("Preencha os campos obrigatórios");

      const { error } = await supabase.from('doc_seg').insert({
        empresa: parseInt(createData.empresa),
        doc: parseInt(createData.doc),
        mes: createData.mes,
        status: createData.status,
        data_recebimento: createData.data_recebimento,
        prazo: createData.prazo,
        data_entrega: createData.data_entrega || createData.prazo,
        enviado: false,
        valor: createData.valor
      });

      if (error) throw error;
      
      setShowCreateModal(false);
      fetchData();
    } catch (error: any) {
      alert("Erro ao criar documento: " + error.message);
    }
  };

  const handleUpdate = async () => {
    if (!selectedDoc) return;
    try {
      const { error } = await supabase
        .from('doc_seg')
        .update({
          status: editData.status,
          valor: editData.valor,
          data_recebimento: editData.data_recebimento,
          prazo: editData.prazo,
          data_entrega: editData.data_entrega,
          enviado: editData.enviado
        })
        .eq('id', selectedDoc.id);

      if (error) throw error;
      
      setSelectedDoc(null);
      fetchData();
    } catch (error: any) {
      alert("Erro ao atualizar: " + error.message);
    }
  };

  const groupedDocs = useMemo(() => {
    const groups: { [key: number]: DocSeg[] } = {};
    documents.forEach(doc => {
      const m = doc.mes;
      if (!groups[m]) groups[m] = [];
      groups[m].push(doc);
    });
    return groups;
  }, [documents]);

  const filteredMonths = Object.keys(groupedDocs)
    .map(Number)
    .sort((a, b) => b - a);

  const filteredProcedimentos = procedimentos.filter(p => p.idcategoria === 44 || p.idcategoria === 43);

  return (
    <div className="pb-10">
      <GlassHeader 
        title="Gestão de Documentos" 
        actions={
          <Button onClick={() => setShowCreateModal(true)} className="shadow-blue-500/20">
            <Plus size={18} strokeWidth={2.5} />
            <span>Novo Documento</span>
          </Button>
        }
      />

      <div className="px-8">
        <div className="relative mb-8 max-w-md">
            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder="Buscar documento ou empresa..." 
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
            <div className="space-y-12">
            {filteredMonths.map(month => {
                const docsInMonth = groupedDocs[month].filter(d => 
                    d.unidades?.nome_unidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    d.procedimento?.nome.toLowerCase().includes(searchTerm.toLowerCase())
                );
                
                if (docsInMonth.length === 0) return null;

                return (
                <div key={month} className="animate-fade-in-up">
                    <div className="flex items-center gap-3 mb-6 ml-2">
                        <div className="w-1.5 h-6 bg-ios-blue rounded-full"></div>
                        <h2 className="text-xl font-bold text-gray-800">{MONTHS[month - 1]}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {docsInMonth.map(doc => (
                        <div key={doc.id} onClick={() => setSelectedDoc(doc)} className="cursor-pointer group">
                            <Card className={`hover:-translate-y-1 hover:shadow-ios-float transition-all duration-300 relative overflow-hidden h-full flex flex-col ${doc.enviado ? 'ring-1 ring-green-100' : ''}`}>
                                {doc.enviado && (
                                    <div className="absolute top-0 right-0 p-2.5 bg-green-500/10 rounded-bl-2xl">
                                        <CheckCircle2 size={16} className="text-green-600" />
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-ios-blue group-hover:bg-ios-blue group-hover:text-white transition-colors duration-300">
                                        <FileIcon size={20} strokeWidth={2.5} />
                                    </div>
                                    <Badge status={doc.status} />
                                </div>
                                
                                <h3 className="font-bold text-[17px] text-gray-900 leading-snug mb-1" title={doc.unidades?.nome_unidade}>
                                    {doc.unidades?.nome_unidade || 'Empresa desconhecida'}
                                </h3>

                                <div className="text-sm text-gray-500 font-medium mb-auto">
                                    {doc.procedimento?.nome || 'Sem nome'}
                                </div>
                                
                                <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center text-xs font-medium">
                                    <div className="flex items-center gap-1.5 text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                                        <Calendar size={12} />
                                        {new Date(doc.prazo).toLocaleDateString()}
                                    </div>
                                    <div className="text-gray-900 font-semibold">
                                        {doc.valor ? `R$ ${doc.valor.toFixed(2)}` : 'R$ 0,00'}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ))}
                    </div>
                </div>
                );
            })}
            </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
            <Card className="w-full max-w-2xl overflow-hidden animate-scale-in p-0 shadow-2xl">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-xl">
                    <h2 className="text-2xl font-bold text-gray-900">Novo Documento</h2>
                    <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all">
                        <span className="text-xl leading-none">&times;</span>
                    </button>
                </div>
                
                <div className="p-8 max-h-[75vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Column 1: Core Info */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <FileIcon size={14} /> Informações Básicas
                            </h3>
                            <Select 
                                label="Empresa" 
                                icon={<Building2 size={18}/>}
                                value={createData.empresa}
                                onChange={e => setCreateData({...createData, empresa: e.target.value})}
                            >
                                <option value="">Selecione uma empresa</option>
                                {unidades.map(u => <option key={u.id} value={u.id}>{u.nome_unidade}</option>)}
                            </Select>

                            <Select 
                                label="Tipo de Documento"
                                icon={<FileIcon size={18}/>}
                                value={createData.doc}
                                onChange={e => setCreateData({...createData, doc: e.target.value})}
                            >
                                <option value="">Selecione o tipo</option>
                                {filteredProcedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                            </Select>

                             <Select 
                                label="Mês de Referência"
                                icon={<Calendar size={18}/>}
                                value={createData.mes}
                                onChange={e => setCreateData({...createData, mes: parseInt(e.target.value)})}
                            >
                                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </Select>
                        </div>

                        {/* Column 2: Details */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock size={14} /> Prazos e Valores
                            </h3>
                            
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <Input 
                                        label="Recebimento" 
                                        type="date"
                                        className="bg-white"
                                        value={createData.data_recebimento}
                                        onChange={e => setCreateData({...createData, data_recebimento: e.target.value})}
                                    />
                                    <Input 
                                        label="Prazo" 
                                        type="date"
                                        className="bg-white"
                                        value={createData.prazo}
                                        onChange={e => setCreateData({...createData, prazo: e.target.value})}
                                    />
                                </div>
                                <Input 
                                    label="Valor do Serviço" 
                                    type="number" 
                                    step="0.01"
                                    icon={<DollarSign size={16}/>}
                                    className="bg-white"
                                    placeholder="0,00"
                                    value={createData.valor}
                                    onChange={e => setCreateData({...createData, valor: parseFloat(e.target.value)})}
                                />
                            </div>

                            <Select 
                                label="Status Inicial"
                                icon={<AlertCircle size={18}/>}
                                value={createData.status}
                                onChange={e => setCreateData({...createData, status: e.target.value})}
                            >
                                <option value="Pendente">Pendente</option>
                                <option value="Em Andamento">Em Andamento</option>
                                <option value="Concluido">Concluído</option>
                                <option value="Entregue">Entregue</option>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                    <Button variant="ghost" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                    <Button className="flex-1 shadow-blue-500/20" onClick={handleCreate}>Criar Documento</Button>
                </div>
            </Card>
        </div>
      )}

      {/* Edit Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
            <Card className="w-full max-w-lg overflow-hidden animate-scale-in p-0 shadow-2xl">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedDoc.unidades?.nome_unidade}</h2>
                        <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
                            <FileIcon size={12} /> {selectedDoc.procedimento?.nome}
                        </p>
                    </div>
                    <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <Select 
                            label="Status Atual"
                            value={editData.status}
                            className="font-medium"
                            onChange={e => setEditData({...editData, status: e.target.value})}
                        >
                            <option value="Pendente">Pendente</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Concluido">Concluído</option>
                            <option value="Entregue">Entregue</option>
                        </Select>
                        <Input 
                            label="Valor (R$)" 
                            type="number" 
                            step="0.01"
                            icon={<DollarSign size={16}/>}
                            value={editData.valor || 0}
                            onChange={e => setEditData({...editData, valor: parseFloat(e.target.value)})}
                        />
                    </div>

                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datas</h3>
                        <div className="grid grid-cols-2 gap-4">
                             <Input 
                                label="Recebimento" 
                                type="date"
                                className="bg-white"
                                value={editData.data_recebimento ? new Date(editData.data_recebimento).toISOString().split('T')[0] : ''}
                                onChange={e => setEditData({...editData, data_recebimento: e.target.value})}
                            />
                             <Input 
                                label="Prazo" 
                                type="date"
                                className="bg-white"
                                value={editData.prazo ? new Date(editData.prazo).toISOString().split('T')[0] : ''}
                                onChange={e => setEditData({...editData, prazo: e.target.value})}
                            />
                        </div>
                        
                        <div className="pt-2 border-t border-gray-200/50">
                            <Input 
                                label="Data de Entrega" 
                                type="date"
                                className="bg-white"
                                value={editData.data_entrega ? new Date(editData.data_entrega).toISOString().split('T')[0] : ''}
                                onChange={e => setEditData({...editData, data_entrega: e.target.value})}
                            />
                        </div>
                    </div>

                    <Toggle 
                        label="Documento Enviado"
                        description="Marque se o documento já foi enviado ao cliente."
                        checked={editData.enviado || false}
                        onChange={(val) => setEditData({...editData, enviado: val})}
                    />
                </div>

                <div className="p-5 border-t border-gray-100 flex gap-3">
                    <Button variant="ghost" className="flex-1" onClick={() => setSelectedDoc(null)}>Fechar</Button>
                    <Button className="flex-1" onClick={handleUpdate}>Salvar Alterações</Button>
                </div>
            </Card>
        </div>
      )}
    </div>
  );
};