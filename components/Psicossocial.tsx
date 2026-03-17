import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { DocSeg, MONTHS, Unidade, Procedimento } from '../types';
import { Card, Badge, Button, Input, Select, GlassHeader, Toggle } from './UI';
import { Plus, Search, Calendar, FileText as FileIcon, CheckCircle2, Building2, DollarSign, Clock, AlertCircle, AlignLeft, Trash2, AlertTriangle, X, Wallet, Activity, ArrowRight, RefreshCw } from 'lucide-react';

// Componente para a tela de Avaliações Psicossociais
export const Psicossocial: React.FC = () => {
    // Estados para controle de dados e interface
    const [documents, setDocuments] = useState<DocSeg[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Estados para modais
    const [selectedDoc, setSelectedDoc] = useState<DocSeg | null>(null);
    const [selectedPsicoGroup, setSelectedPsicoGroup] = useState<{ empresaId: number; nome_unidade: string; docs: DocSeg[] } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Dados auxiliares
    const [unidades, setUnidades] = useState<Unidade[]>([]);
    const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);

    // Estado para formulário de edição
    const [editData, setEditData] = useState<{
        status?: string;
        valor?: number;
        data_recebimento?: string;
        prazo?: string;
        data_entrega?: string;
        enviado?: boolean;
        obs?: string | null;
        faturado?: boolean;
        empresaResp?: string;
        isParcelado?: boolean;
        qntParcelas?: number;
    }>({});

    // Função para buscar dados do Supabase
    const fetchData = async () => {
        setLoading(true);
        try {
            // Busca apenas documentos que sejam Avaliações Psicossociais (IDs 576 e 577)
            const { data, error } = await supabase
                .from('doc_seg')
                .select(`
                    *,
                    unidades:empresa (id, nome_unidade),
                    procedimento:doc (id, nome, idcategoria)
                `)
                .or('doc.eq.576,doc.eq.577') // Filtra especificamente pelos IDs informados
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setDocuments(data as unknown as DocSeg[]);

            // Busca unidades e procedimentos para referência
            const { data: uniData } = await supabase.from('unidades').select('id, nome_unidade');
            const { data: procData } = await supabase.from('procedimento').select('id, nome, idcategoria');

            if (uniData) setUnidades(uniData);
            if (procData) setProcedimentos(procData);

        } catch (err) {
            console.error('Erro ao buscar dados psicossociais:', err);
        } finally {
            setLoading(false);
        }
    };

    // Efeito inicial para carregar dados
    useEffect(() => {
        fetchData();
    }, []);

    // Atualiza o formulário de edição quando um documento é selecionado
    useEffect(() => {
        if (selectedDoc) {
            setEditData({
                status: selectedDoc.status,
                valor: selectedDoc.valor || 0,
                data_recebimento: selectedDoc.data_recebimento,
                prazo: selectedDoc.prazo,
                data_entrega: selectedDoc.data_entrega,
                enviado: selectedDoc.enviado,
                obs: selectedDoc.obs,
                faturado: selectedDoc.faturado || false,
                empresaResp: 'Gama Medicina',
                isParcelado: false,
                qntParcelas: 1
            });
        }
    }, [selectedDoc]);

    // Função para ocultar "NR" seguido de números da descrição do serviço
    const cleanServiceName = (name: string) => {
        if (!name) return 'Sem nome';
        // Regex para remover "NR" seguido de números (com ou sem espaço, ex: NR 35, NR10)
        return name.replace(/NR\s?\d+/gi, '').trim().replace(/\s\s+/g, ' ');
    };

    // Lógica para agrupar documentos por mês e empresa (Exatamente como no DocumentList)
    const groupedDocs = useMemo(() => {
        const groups: { [key: number]: any[] } = {};
        const psicoTrack: { [mes: number]: { [empresa: number]: { count: number; deliveredCount: number; docIndex: number; baseDoc: DocSeg; docs: DocSeg[] } } } = {};

        documents.forEach((doc) => {
            const m = doc.mes;
            if (!groups[m]) groups[m] = [];

            if (!psicoTrack[m]) psicoTrack[m] = {};

            if (!psicoTrack[m][doc.empresa]) {
                psicoTrack[m][doc.empresa] = {
                    count: 1,
                    deliveredCount: doc.status === 'Entregue' ? 1 : 0,
                    docIndex: groups[m].length,
                    baseDoc: doc,
                    docs: [doc]
                };
                groups[m].push({
                    isPsicossocialGroup: true,
                    empresaId: doc.empresa,
                    nome_unidade: doc.unidades?.nome_unidade || 'Empresa desconhecida',
                    count: 1,
                    deliveredCount: doc.status === 'Entregue' ? 1 : 0,
                    baseDoc: doc,
                    docs: [doc]
                });
            } else {
                psicoTrack[m][doc.empresa].count += 1;
                if (doc.status === 'Entregue') psicoTrack[m][doc.empresa].deliveredCount += 1;
                psicoTrack[m][doc.empresa].docs.push(doc);
                
                groups[m][psicoTrack[m][doc.empresa].docIndex].count = psicoTrack[m][doc.empresa].count;
                groups[m][psicoTrack[m][doc.empresa].docIndex].deliveredCount = psicoTrack[m][doc.empresa].deliveredCount;
                groups[m][psicoTrack[m][doc.empresa].docIndex].docs = psicoTrack[m][doc.empresa].docs;
            }
        });
        return groups;
    }, [documents]);

    // Calcula contagem de status para os filtros
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {
            'Todos': 0,
            'Pendente': 0,
            'Em Andamento': 0,
            'Concluido': 0,
            'Entregue': 0,
            'Vencidos': 0
        };

        const todayStr = new Date().toISOString().split('T')[0];

        // Filtra antes de contar
        const filtered = documents.filter(doc => {
            const matchesSearch = doc.unidades?.nome_unidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.procedimento?.nome.toLowerCase().includes(searchTerm.toLowerCase());

            let matchesDate = true;
            if (startDate) matchesDate = matchesDate && doc.prazo >= startDate;
            if (endDate) matchesDate = matchesDate && doc.prazo <= endDate;

            return matchesSearch && matchesDate;
        });

        counts['Todos'] = filtered.length;

        filtered.forEach(doc => {
            const isOverdue = doc.prazo < todayStr && doc.status !== 'Entregue' && doc.status !== 'Concluido';

            if (isOverdue) {
                counts['Vencidos']++;
            } else {
                if (doc.status === 'Pendente') counts['Pendente']++;
                if (doc.status === 'Em Andamento') counts['Em Andamento']++;
                if (doc.status === 'Concluido') counts['Concluido']++;
                if (doc.status === 'Entregue') counts['Entregue']++;
            }
        });

        return counts;
    }, [documents, searchTerm, startDate, endDate]);

    // Opções de filtro de status
    const filterOptions = [
        { label: 'Todos', value: 'Todos' },
        { label: 'Pendente', value: 'Pendente' },
        { label: 'Em Andamento', value: 'Em Andamento' },
        { label: 'Concluído', value: 'Concluido' },
        { label: 'Entregue', value: 'Entregue' },
        { label: 'Vencidos', value: 'Vencidos' },
    ];

    // Função para atualizar um documento (incluindo lógica financeira)
    const handleUpdate = async () => {
        if (!selectedDoc) return;
        try {
            // Lógica financeira simplificada para manter compatibilidade
            if (editData.faturado && !selectedDoc.faturado) {
                const { data: unitDetails } = await supabase.from('unidades').select('empresaid').eq('id', selectedDoc.empresa).single();
                const contratanteId = unitDetails?.empresaid || null;

                const payloadFinanceiro = {
                    data_projetada: editData.prazo,
                    valor_doc: editData.valor,
                    valor_total: editData.valor,
                    status: 'Aguardando',
                    empresa_resp: editData.empresaResp,
                    parcela: editData.isParcelado,
                    qnt_parcela: editData.isParcelado ? editData.qntParcelas : 1,
                    parcela_paga: 0,
                    contratante: contratanteId,
                    descricao: `Avaliação Psicossocial: ${selectedDoc.procedimento?.nome}`,
                    valor_outros: 0
                };

                await supabase.from('financeiro_receitas').insert(payloadFinanceiro);
                
                // Lógica de meta (gerenciaId 24 conforme DocumentList)
                const gerenciaId = 24;
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

                const { data: existingMeta } = await supabase.from('gerencia_meta').select('id, faturamento').eq('gerencia', gerenciaId).gte('created_at', startOfMonth).lte('created_at', endOfMonth).maybeSingle();

                if (existingMeta) {
                    await supabase.from('gerencia_meta').update({ faturamento: (existingMeta.faturamento || 0) + (editData.valor || 0) }).eq('id', existingMeta.id);
                } else {
                    await supabase.from('gerencia_meta').insert({ gerencia: gerenciaId, faturamento: editData.valor });
                }
            }

            // Atualiza o documento na tabela doc_seg
            const { error } = await supabase.from('doc_seg').update({
                status: editData.status,
                valor: editData.valor,
                data_recebimento: editData.data_recebimento,
                prazo: editData.prazo,
                data_entrega: editData.data_entrega,
                enviado: editData.enviado,
                obs: editData.obs,
                faturado: editData.faturado
            }).eq('id', selectedDoc.id);

            if (error) throw error;

            // Limpa seleção e recarrega dados
            setSelectedDoc(null);
            fetchData();
        } catch (error: any) {
            alert("Erro ao atualizar: " + error.message);
        }
    };

    // Função para executar a exclusão
    const executeDelete = async () => {
        if (!selectedDoc) return;
        try {
            const { error } = await supabase.from('doc_seg').delete().eq('id', selectedDoc.id);
            if (error) throw error;
            setShowDeleteConfirm(false);
            setSelectedDoc(null);
            fetchData();
        } catch (error: any) {
            alert("Erro ao excluir: " + error.message);
        }
    };

    // Ordenação dos meses para exibição
    const filteredMonths = Object.keys(groupedDocs).map(Number).sort((a, b) => b - a);

    return (
        <div className="pb-10 animate-fade-in">
            {/* Cabeçalho Premium estilo iOS */}
            <GlassHeader
                title="Avaliações Psicossociais"
                actions={
                    <Button onClick={() => fetchData()} variant="secondary" className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">
                        <RefreshCw size={18} strokeWidth={2.5} />
                        <span>Atualizar</span>
                    </Button>
                }
            />

            {/* Barra de Pesquisa e Filtros */}
            <div className="px-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar empresa psicossocial..."
                            className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl shadow-sm border-none focus:ring-2 focus:ring-ios-blue outline-none transition-shadow"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={`p-3.5 rounded-2xl shadow-sm transition-all duration-300 flex items-center justify-center h-[52px] w-[52px] ${showDatePicker || startDate || endDate ? 'bg-ios-blue text-white' : 'bg-white text-gray-400 hover:text-gray-600'}`}
                        >
                            <Calendar size={20} />
                        </button>
                        {showDatePicker && (
                            <div className="absolute right-0 top-full mt-2 z-50 p-4 bg-white/95 backdrop-blur-xl border border-white/40 rounded-2xl shadow-ios-float animate-scale-in flex flex-col gap-4 w-72">
                                <h4 className="text-sm font-bold text-gray-800">Filtrar por Prazo</h4>
                                <div className="space-y-3">
                                    <Input label="De:" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                    <Input label="Até:" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                </div>
                                <Button onClick={() => setShowDatePicker(false)}>Aplicar Filtro</Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filtros de Status (Pills) */}
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 mb-10">
                    {filterOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setStatusFilter(opt.value)}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border whitespace-nowrap
                                ${statusFilter === opt.value
                                    ? (opt.value === 'Vencidos'
                                        ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
                                        : 'bg-ios-blue border-ios-blue text-white shadow-lg shadow-blue-500/30 scale-105')
                                    : 'bg-white border-white hover:border-gray-200 text-gray-500 hover:bg-gray-50'
                                }
                            `}
                        >
                            {opt.label}
                            <span className={`
                                flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold
                                ${statusFilter === opt.value
                                    ? (opt.value === 'Vencidos' ? 'bg-white/30 text-white' : 'bg-white/20 text-white')
                                    : 'bg-gray-100 text-gray-400'
                                }
                            `}>
                                {statusCounts[opt.value] || 0}
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
                        const todayStr = new Date().toISOString().split('T')[0];
                        const itemsInMonth = groupedDocs[month].filter(item => {
                            const matchesSearch = item.nome_unidade.toLowerCase().includes(searchTerm.toLowerCase());
                            let matchesDate = true;
                            if (startDate) matchesDate = matchesDate && item.baseDoc.prazo >= startDate;
                            if (endDate) matchesDate = matchesDate && item.baseDoc.prazo <= endDate;
                            
                            if (statusFilter === 'Todos') return matchesSearch && matchesDate;
                            if (statusFilter === 'Vencidos') return matchesSearch && (item.docs as DocSeg[]).some(d => d.prazo < todayStr && d.status !== 'Entregue' && d.status !== 'Concluido') && matchesDate;
                            
                            return matchesSearch && (item.docs as DocSeg[]).some(d => d.status === statusFilter) && matchesDate;
                        });

                        if (itemsInMonth.length === 0) return null;

                        return (
                            <div key={month} className="px-8 animate-fade-in-up">
                                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-ios-blue rounded-full"></div>
                                    {MONTHS[month - 1]}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {itemsInMonth.map((item, index) => (
                                        <div key={index} className="group cursor-pointer" onClick={() => setSelectedPsicoGroup(item)}>
                                            <Card className="hover:-translate-y-1 hover:shadow-ios-float transition-all duration-300 ring-1 ring-purple-100 bg-purple-50/10 h-full flex flex-col">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                                                        <Activity size={20} strokeWidth={2.5} />
                                                    </div>
                                                    <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                                                        {item.deliveredCount}/{item.count} avaliações
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-[17px] text-gray-900 mb-1">{item.nome_unidade}</h3>
                                                <div className="text-sm text-purple-600 font-bold">Psicossocial</div>
                                            </Card>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Detalhes do Grupo (Exatamente como no DocumentList) */}
            {selectedPsicoGroup && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-2xl overflow-hidden animate-scale-in p-0 shadow-2xl">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-purple-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Avaliações Psicossociais</h2>
                                <p className="text-purple-600 text-sm mt-1 font-semibold">{selectedPsicoGroup.nome_unidade}</p>
                            </div>
                            <button onClick={() => setSelectedPsicoGroup(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                                <span className="text-2xl leading-none">&times;</span>
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                            {selectedPsicoGroup.docs.map(doc => (
                                <div key={doc.id} className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                            <Activity size={16} className="text-purple-500" />
                                            {cleanServiceName(doc.procedimento?.nome || '')}
                                        </h4>
                                        <Badge status={doc.status} />
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-medium text-gray-600 mt-4 border-t pt-3 border-gray-50">
                                        <div className="flex items-center gap-1.5"><Calendar size={12} className="text-gray-400" /> Prazo: {new Date(doc.prazo).toLocaleDateString()}</div>
                                        <div className="flex items-center gap-1.5"><DollarSign size={12} className="text-green-500" /> {doc.valor ? `R$ ${doc.valor.toFixed(2)}` : 'R$ 0,00'}</div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <Button size="sm" variant="ghost" className="text-ios-blue text-xs" onClick={() => { setSelectedDoc(doc); }}>Ver Detalhes</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <Button variant="secondary" onClick={() => setSelectedPsicoGroup(null)}>Fechar</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modal de Edição (Estilo iOS) */}
            {selectedDoc && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-lg overflow-hidden animate-scale-in p-0 shadow-2xl">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start">
                            <h2 className="text-xl font-bold text-gray-900">{cleanServiceName(selectedDoc.procedimento?.nome || '')}</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={20} /></button>
                                <button onClick={() => setSelectedDoc(null)} className="text-gray-400">&times;</button>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <Select label="Status" value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })}>
                                    <option value="Pendente">Pendente</option>
                                    <option value="Em Andamento">Em Andamento</option>
                                    <option value="Concluido">Concluído</option>
                                    <option value="Entregue">Entregue</option>
                                </Select>
                                <Input label="Valor (R$)" type="number" step="0.01" value={editData.valor || 0} onChange={e => setEditData({ ...editData, valor: parseFloat(e.target.value) })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Prazo" type="date" value={editData.prazo} onChange={e => setEditData({ ...editData, prazo: e.target.value })} />
                                <Input label="Entrega" type="date" value={editData.data_entrega} onChange={e => setEditData({ ...editData, data_entrega: e.target.value })} />
                            </div>
                            <Toggle label="Faturamento" checked={editData.faturado || false} onChange={val => setEditData({ ...editData, faturado: val })} />
                            <textarea
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm outline-none resize-none h-24"
                                placeholder="Observações..."
                                value={editData.obs || ''}
                                onChange={e => setEditData({ ...editData, obs: e.target.value })}
                            />
                        </div>
                        <div className="p-5 border-t border-gray-100 flex gap-3">
                            <Button variant="ghost" className="flex-1" onClick={() => setSelectedDoc(null)}>Cancelar</Button>
                            <Button className="flex-1" onClick={handleUpdate}>Salvar</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Confirmação de Exclusão */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-6 animate-fade-in">
                    <Card className="w-full max-w-sm p-6 text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto"><AlertTriangle size={32} /></div>
                        <h3 className="text-xl font-bold">Excluir Documento?</h3>
                        <p className="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
                        <div className="flex gap-3 mt-4">
                            <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
                            <Button variant="danger" className="flex-1" onClick={executeDelete}>Excluir</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
