import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { DocSeg, MONTHS, Unidade, Procedimento } from '../types';
import { Card, Badge, Button, Input, Select, GlassHeader, Toggle } from './UI';
import { Plus, Search, Calendar, FileText as FileIcon, CheckCircle2, Building2, DollarSign, Clock, AlertCircle, Briefcase, Layers, Check, AlignLeft, Trash2, AlertTriangle, X } from 'lucide-react';

export const DocumentList: React.FC = () => {
  const [documents, setDocuments] = useState<DocSeg[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocSeg | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // New state for delete confirmation

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
    valor: 0,
    obs: '', // New field
    // Financeiro fields
    empresaResp: 'Gama Medicina', // Default
    isParcelado: false,
    qntParcelas: 1
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

      // Fixed: Fetch only existing columns to ensure dropdown works
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
        enviado: selectedDoc.enviado,
        obs: selectedDoc.obs // Populate obs
      });
    }
  }, [selectedDoc]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts = {
        'Todos': documents.length,
        'Pendente': 0,
        'Em Andamento': 0,
        'Concluido': 0,
        'Entregue': 0
    };

    documents.forEach(doc => {
        if (doc.status === 'Pendente') counts['Pendente']++;
        if (doc.status === 'Em Andamento') counts['Em Andamento']++;
        if (doc.status === 'Concluido') counts['Concluido']++;
        if (doc.status === 'Entregue') counts['Entregue']++;
    });

    return counts;
  }, [documents]);

  const filterOptions = [
      { label: 'Todos', value: 'Todos' },
      { label: 'Pendente', value: 'Pendente' },
      { label: 'Em Andamento', value: 'Em Andamento' },
      { label: 'Concluído', value: 'Concluido' },
      { label: 'Entregue', value: 'Entregue' },
  ];

  const handleCreate = async () => {
    try {
      if (!createData.empresa || !createData.doc) return alert("Preencha os campos obrigatórios");

      // 1. Insert into Documentos (doc_seg)
      const { error: docError } = await supabase.from('doc_seg').insert({
        empresa: parseInt(createData.empresa),
        doc: parseInt(createData.doc),
        mes: createData.mes,
        status: createData.status,
        data_recebimento: createData.data_recebimento,
        prazo: createData.prazo,
        data_entrega: createData.data_entrega || createData.prazo,
        enviado: false,
        valor: createData.valor,
        obs: createData.obs // Insert obs
      });

      if (docError) throw docError;

      // 2. Insert into Financeiro Receitas
      // Fetch empresaid from unidades table for the selected unit
      const { data: unitDetails } = await supabase
        .from('unidades')
        .select('empresaid')
        .eq('id', createData.empresa)
        .single();
      
      // Use empresaid as contratante
      const contratanteId = unitDetails?.empresaid || null;
      const selectedProc = procedimentos.find(p => p.id === parseInt(createData.doc));
      
      const payloadFinanceiro = {
        data_projetada: createData.prazo, // Prazo
        valor_doc: createData.valor,
        valor_total: createData.valor,
        status: 'Aguardando',
        empresa_resp: createData.empresaResp,
        parcela: createData.isParcelado,
        qnt_parcela: createData.isParcelado ? createData.qntParcelas : 1,
        parcela_paga: 0,
        contratante: contratanteId, 
        descricao: selectedProc ? `Documento: ${selectedProc.nome}` : 'Documento de Segurança',
        valor_outros: 0
      };

      const { error: finError } = await supabase.from('financeiro_receitas').insert(payloadFinanceiro);

      if (finError) {
        console.error("Erro ao criar financeiro:", finError);
        alert("Documento criado, mas houve um erro ao gerar o financeiro: " + finError.message);
      }
      
      setShowCreateModal(false);
      // Reset sensitive fields
      setCreateData(prev => ({ ...prev, valor: 0, isParcelado: false, qntParcelas: 1, obs: '' }));
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
          enviado: editData.enviado,
          obs: editData.obs // Update obs
        })
        .eq('id', selectedDoc.id);

      if (error) throw error;
      
      setSelectedDoc(null);
      fetchData();
    } catch (error: any) {
      alert("Erro ao atualizar: " + error.message);
    }
  };

  // Triggered by the trash button
  const handleRequestDelete = () => {
      setShowDeleteConfirm(true);
  };

  // The actual deletion logic
  const executeDelete = async () => {
    if (!selectedDoc) {
        console.error("❌ Tentativa de exclusão sem documento selecionado.");
        return;
    }
    
    const idToDelete = selectedDoc.id;
    console.group("🗑️ Executando Exclusão (Modal)");
    console.log("📍 ID do Documento:", idToDelete);

    try {
        console.log("📡 Enviando requisição DELETE para o Supabase...");
        
        const { data, error, count } = await supabase
            .from('doc_seg')
            .delete()
            .eq('id', idToDelete)
            .select();

        if (error) {
            console.error("❌ Erro retornado pelo Supabase:", error);
            throw error;
        }

        console.log("✅ Resposta do Supabase:", { data, count });

        // Close everything on success
        setShowDeleteConfirm(false);
        setSelectedDoc(null);
        fetchData();
        // Optional: Show a small toast notification here instead of alert

    } catch (error: any) {
        console.error("❌ Exceção capturada:", error);
        alert("Erro ao excluir: " + (error.message || JSON.stringify(error)));
        setShowDeleteConfirm(false); // Close confirm modal on error
    } finally {
        console.groupEnd();
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
        <div className="flex flex-col gap-6 mb-8">
            <div className="relative w-full">
                <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Buscar documento ou empresa..." 
                    className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl shadow-sm border-none focus:ring-2 focus:ring-ios-blue outline-none transition-shadow"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                {filterOptions.map(opt => (
                    <button 
                        key={opt.value}
                        onClick={() => setStatusFilter(opt.value)}
                        className={`
                            flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border whitespace-nowrap
                            ${statusFilter === opt.value 
                                ? 'bg-ios-blue border-ios-blue text-white shadow-lg shadow-blue-500/30 scale-105' 
                                : 'bg-white border-white hover:border-gray-200 text-gray-500 hover:bg-gray-50'
                            }
                        `}
                    >
                        {opt.label}
                        <span className={`
                            flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold
                            ${statusFilter === opt.value 
                                ? 'bg-white/20 text-white' 
                                : 'bg-gray-100 text-gray-400'
                            }
                        `}>
                            {statusCounts[opt.value as keyof typeof statusCounts] || 0}
                        </span>
                    </button>
                ))}
            </div>
        </div>

        {loading ? (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ios-blue"></div>
            </div>
        ) : (
            <div className="space-y-12">
            {filteredMonths.map(month => {
                const docsInMonth = groupedDocs[month].filter(d => {
                    const matchesSearch = 
                        d.unidades?.nome_unidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        d.procedimento?.nome.toLowerCase().includes(searchTerm.toLowerCase());
                    
                    const matchesStatus = statusFilter === 'Todos' || d.status === statusFilter;

                    return matchesSearch && matchesStatus;
                });
                
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
            <Card className="w-full max-w-3xl overflow-hidden animate-scale-in p-0 shadow-2xl">
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
                            
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2 pt-4">
                                <Briefcase size={14} /> Financeiro
                            </h3>
                            
                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1 mb-2 block">Empresa Responsável</label>
                                    <div className="flex gap-4">
                                        <label className={`flex items-center gap-2 cursor-pointer bg-white px-4 py-3 rounded-xl border shadow-sm flex-1 justify-center transition-all ${createData.empresaResp === 'Gama Medicina' ? 'border-ios-blue ring-1 ring-ios-blue' : 'border-blue-100 hover:bg-blue-50'}`}>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${createData.empresaResp === 'Gama Medicina' ? 'border-ios-blue bg-ios-blue' : 'border-gray-300'}`}>
                                                {createData.empresaResp === 'Gama Medicina' && <Check size={12} className="text-white" />}
                                            </div>
                                            <input 
                                                type="radio" 
                                                name="empresaResp" 
                                                className="hidden" 
                                                checked={createData.empresaResp === 'Gama Medicina'} 
                                                onChange={() => setCreateData({...createData, empresaResp: 'Gama Medicina'})} 
                                            />
                                            <span className={`text-sm font-medium ${createData.empresaResp === 'Gama Medicina' ? 'text-ios-blue' : 'text-gray-600'}`}>Gama Medicina</span>
                                        </label>

                                        <label className={`flex items-center gap-2 cursor-pointer bg-white px-4 py-3 rounded-xl border shadow-sm flex-1 justify-center transition-all ${createData.empresaResp === 'Gama Soluções' ? 'border-ios-blue ring-1 ring-ios-blue' : 'border-blue-100 hover:bg-blue-50'}`}>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${createData.empresaResp === 'Gama Soluções' ? 'border-ios-blue bg-ios-blue' : 'border-gray-300'}`}>
                                                {createData.empresaResp === 'Gama Soluções' && <Check size={12} className="text-white" />}
                                            </div>
                                            <input 
                                                type="radio" 
                                                name="empresaResp" 
                                                className="hidden" 
                                                checked={createData.empresaResp === 'Gama Soluções'} 
                                                onChange={() => setCreateData({...createData, empresaResp: 'Gama Soluções'})} 
                                            />
                                            <span className={`text-sm font-medium ${createData.empresaResp === 'Gama Soluções' ? 'text-ios-blue' : 'text-gray-600'}`}>Gama Soluções</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <Toggle 
                                    label="Parcelamento"
                                    description="Gerar múltiplas parcelas no financeiro?"
                                    checked={createData.isParcelado}
                                    onChange={(val) => setCreateData({...createData, isParcelado: val})}
                                />

                                {createData.isParcelado && (
                                    <div className="animate-fade-in">
                                        <Input 
                                            label="Quantidade de Parcelas" 
                                            type="number" 
                                            min="2"
                                            max="48"
                                            icon={<Layers size={16}/>}
                                            className="bg-white border-blue-200 focus:border-blue-400"
                                            value={createData.qntParcelas}
                                            onChange={e => setCreateData({...createData, qntParcelas: parseInt(e.target.value)})}
                                        />
                                    </div>
                                )}
                            </div>
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

                             <div className="pt-2">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1 mb-1.5 flex items-center gap-1"><AlignLeft size={10} /> Observações</label>
                                <textarea
                                    className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl p-4 text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-ios-blue focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none h-24"
                                    placeholder="Adicione detalhes, notas ou observações..."
                                    value={createData.obs}
                                    onChange={e => setCreateData({...createData, obs: e.target.value})}
                                />
                            </div>
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
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleRequestDelete}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Excluir Documento"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                            <span className="text-2xl leading-none">&times;</span>
                        </button>
                    </div>
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

                    <div className="w-full">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1 mb-1.5 flex items-center gap-1"><AlignLeft size={10} /> Observações</label>
                        <textarea
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-ios-blue focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none h-24"
                            placeholder="Observações sobre o documento..."
                            value={editData.obs || ''}
                            onChange={e => setEditData({...editData, obs: e.target.value})}
                        />
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

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-6 animate-fade-in">
              <Card className="w-full max-w-sm overflow-hidden animate-scale-in p-6 shadow-2xl border-2 border-white/50 relative">
                  <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
                          <AlertTriangle size={32} strokeWidth={2} />
                      </div>
                      
                      <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Documento?</h3>
                          <p className="text-sm text-gray-500 leading-relaxed">
                              Tem certeza que deseja excluir <strong>{selectedDoc?.procedimento?.nome}</strong> da empresa <strong>{selectedDoc?.unidades?.nome_unidade}</strong>?
                          </p>
                          <p className="text-xs text-gray-400 mt-2 font-medium bg-gray-50 py-1 px-2 rounded-lg inline-block">
                              O registro financeiro NÃO será apagado.
                          </p>
                      </div>

                      <div className="flex gap-3 w-full mt-4">
                          <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                              Cancelar
                          </Button>
                          <Button variant="danger" className="flex-1 shadow-red-500/20" onClick={executeDelete}>
                              Sim, Excluir
                          </Button>
                      </div>
                  </div>
              </Card>
          </div>
      )}
    </div>
  );
};