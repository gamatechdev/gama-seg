import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { DocSeg, MONTHS, Unidade, Procedimento } from '../types';
import { Card, Badge, Button, Input, Select, GlassHeader, Toggle } from './UI';
import { Plus, Search, Calendar, FileText as FileIcon, CheckCircle2, Building2, DollarSign, Clock, AlertCircle, Briefcase, Layers, Check, AlignLeft, Trash2, AlertTriangle, X, Wallet, HardHat, Activity, Lock, ArrowRight, FilePlus, RefreshCw } from 'lucide-react';

export const DocumentList: React.FC = () => {
    const [documents, setDocuments] = useState<DocSeg[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showPcmsoModal, setShowPcmsoModal] = useState(false);
    const [showCompanyDataModal, setShowCompanyDataModal] = useState(false);
    const [showPcmsoConfigModal, setShowPcmsoConfigModal] = useState(false);
    const [showMedicalDataModal, setShowMedicalDataModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<DocSeg | null>(null);
    const [selectedPsicoGroup, setSelectedPsicoGroup] = useState<{ empresaId: number; nome_unidade: string; docs: DocSeg[] } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        obs: ''
    });

    // Edit Form State - Includes extra fields for billing configuration
    const [editData, setEditData] = useState<{
        status?: string;
        valor?: number;
        data_recebimento?: string;
        prazo?: string;
        data_entrega?: string;
        enviado?: boolean;
        obs?: string | null;
        faturado?: boolean;
        // Temporary billing fields used only during update
        empresaResp?: string;
        isParcelado?: boolean;
        qntParcelas?: number;
    }>({});

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
                valor: selectedDoc.valor || 0,
                data_recebimento: selectedDoc.data_recebimento,
                prazo: selectedDoc.prazo,
                data_entrega: selectedDoc.data_entrega,
                enviado: selectedDoc.enviado,
                obs: selectedDoc.obs,
                faturado: selectedDoc.faturado || false,
                // Defaults for billing
                empresaResp: 'Gama Medicina',
                isParcelado: false,
                qntParcelas: 1
            });
        }
    }, [selectedDoc]);

    // Company Form Data
    const [companyFormData, setCompanyFormData] = useState({
        unidade_id: 0,
        razao_social: "",
        nome_fantasia: "",
        cnpj: "",
        inscricao_estadual: "",
        endereco: {
            logradouro: "",
            numero: "",
            complemento: "",
            bairro: "",
            cidade: "",
            estado: "",
            cep: ""
        },
        cnae: {
            codigo: "",
            descricao: ""
        },
        cnaes: {
            principal: {
                codigo: "",
                descricao: ""
            },
            secundarios: [
                {
                    codigo: "",
                    descricao: ""
                }
            ]
        },
        grau_risco: "",
        ramo_atividade: "",
        horario_expediente: "",
        responsavel_implantacao: {
            nome: "",
            cargo: "",
            registro: ""
        },
        responsavel_elaboracao_pgr: {
            nome: "",
            cargo: "",
            registro: ""
        },
        medico_responsavel: {
            nome: "",
            crm: "",
            rqe: "",
            endereco_profissional: {
                logradouro: "",
                numero: "",
                complemento: "",
                bairro: "",
                cidade: "",
                estado: "",
                cep: ""
            },
            telefone: ""
        },
        medicos_examinadores: [
            {
                nome: "",
                crm: ""
            }
        ],
        cronograma_revisao: {
            numero: "",
            data: "",
            item_revisado: "",
            responsavel: "",
            cargo: "",
            motivo: "Primeira emissão do documento"
        },
        vigencia_emissao: {
            inicio: "",
            fim: "",
            data_emissao: ""
        },
        cronograma_atividades: [
            { id: 1, label: "Apresentação do PCMSO", selected: true, periodo: "" },
            { id: 2, label: "Campanha Conscientização: Alcoolismo e Drogas", selected: true, periodo: "" },
            { id: 3, label: "Campanha Conscientização: Diabetes", selected: true, periodo: "" },
            { id: 4, label: "Campanha Conscientização: Hipertensão arterial", selected: true, periodo: "" },
            { id: 5, label: "Campanha Conscientização: Prevenção ao Suicídio", selected: true, periodo: "" },
            { id: 6, label: "Campanha Conscientização: Prevenção de câncer de mama", selected: true, periodo: "" },
            { id: 7, label: "Campanha Conscientização: Prevenção do Câncer de próstata", selected: true, periodo: "" },
            { id: 8, label: "Campanha Conscientização: Saúde Mental", selected: true, periodo: "" },
            { id: 9, label: "Prevenção e cuidado com a proliferação do mosquito da dengue, Aedes aegypti e Chikungunya", selected: true, periodo: "" },
            { id: 10, label: "Relatório Analítico", selected: true, periodo: "" },
            { id: 11, label: "Treinamento de DST/AIDS", selected: true, periodo: "" },
            { id: 12, label: "Treinamentos em Primeiros Socorros", selected: true, periodo: "" }
        ]
    });

    const pullCompanyData = async () => {
        if (!createData.empresa) {
            alert("Por favor, selecione uma empresa primeiro.");
            return;
        }

        try {
            // 1. Get unit to find the cliente ID
            const { data: unit, error: unitError } = await supabase
                .from('unidades')
                .select('empresaid')
                .eq('id', createData.empresa)
                .single();

            if (unitError) throw unitError;
            if (!unit?.empresaid) {
                alert("Esta unidade não está vinculada a um cadastro central de empresa.");
                return;
            }

            // 2. Fetch company data from 'clientes'
            const { data: company, error: compError } = await supabase
                .from('clientes')
                .select('*')
                .eq('id', unit.empresaid)
                .single();

            if (compError) throw compError;
            if (!company) {
                alert("Dados da empresa não encontrados.");
                return;
            }

            // 3. Update companyFormData
            setCompanyFormData(prev => ({
                ...prev,
                razao_social: company.razao_social || prev.razao_social,
                nome_fantasia: company.nome_fantasia || prev.nome_fantasia,
                cnpj: company.cnpj || prev.cnpj,
                // Simple address mapping
                endereco: {
                    ...prev.endereco,
                    logradouro: company.endereco || prev.endereco.logradouro
                }
            }));

            alert("Dados importados com sucesso!");

        } catch (error: any) {
            console.error("Error pulling data:", error);
            alert("Erro ao buscar dados: " + error.message);
        }
    };

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

            // Insert into Documentos (doc_seg) only. No finance records created yet.
            const { error: docError } = await supabase.from('doc_seg').insert({
                empresa: parseInt(createData.empresa),
                doc: parseInt(createData.doc),
                mes: createData.mes,
                status: createData.status,
                data_recebimento: createData.data_recebimento,
                prazo: createData.prazo,
                data_entrega: createData.data_entrega || createData.prazo,
                enviado: false,
                faturado: false, // Default false on create
                valor: createData.valor,
                obs: createData.obs
            });

            if (docError) throw docError;

            setShowCreateModal(false);
            setCreateData(prev => ({ ...prev, valor: 0, obs: '' }));
            fetchData();

        } catch (error: any) {
            alert("Erro ao criar documento: " + error.message);
        }
    };

    const handleUpdate = async () => {
        if (!selectedDoc) return;
        try {
            // 1. Check if we need to generate finance records (Transitioning from Not Faturado -> Faturado)
            if (editData.faturado && !selectedDoc.faturado) {
                // --- LOGICA FINANCEIRO RECEITAS ---
                const { data: unitDetails } = await supabase
                    .from('unidades')
                    .select('empresaid')
                    .eq('id', selectedDoc.empresa)
                    .single();

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
                    descricao: selectedDoc.procedimento ? `Documento: ${selectedDoc.procedimento.nome}` : 'Documento de Segurança',
                    valor_outros: 0
                };

                const { error: finError } = await supabase.from('financeiro_receitas').insert(payloadFinanceiro);
                if (finError) throw new Error("Erro ao gerar financeiro: " + finError.message);

                // --- LOGICA GERENCIA_META ---
                const gerenciaId = 24;
                const valorToAdd = editData.valor || 0;
                const now = new Date();
                // Calcula início e fim do mês atual para verificar a existência da meta no mês
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

                // Tenta buscar registro existente para este mês e gerencia
                const { data: existingMeta, error: metaFetchError } = await supabase
                    .from('gerencia_meta')
                    .select('id, faturamento')
                    .eq('gerencia', gerenciaId)
                    .gte('created_at', startOfMonth)
                    .lte('created_at', endOfMonth)
                    .maybeSingle();

                if (metaFetchError && metaFetchError.code !== 'PGRST116') {
                    console.error("Erro ao verificar meta:", metaFetchError);
                }

                if (existingMeta) {
                    // Existe: Soma ao valor atual
                    const newFaturamento = (existingMeta.faturamento || 0) + valorToAdd;
                    const { error: updateMetaError } = await supabase
                        .from('gerencia_meta')
                        .update({ faturamento: newFaturamento })
                        .eq('id', existingMeta.id);

                    if (updateMetaError) console.error("Erro ao atualizar meta:", updateMetaError);
                    else console.log("Meta atualizada com sucesso (+R$", valorToAdd, ")");
                } else {
                    // Não existe: Cria nova linha
                    const { error: insertMetaError } = await supabase
                        .from('gerencia_meta')
                        .insert({
                            gerencia: gerenciaId,
                            faturamento: valorToAdd
                            // Outros campos (in, cf, cv, etc) assumem default 0 do banco
                        });

                    if (insertMetaError) console.error("Erro ao criar meta:", insertMetaError);
                    else console.log("Nova meta criada para o mês (R$", valorToAdd, ")");
                }

                alert("Financeiro e Metas processados com sucesso!");
            }

            // 2. Update doc_seg
            const { error } = await supabase
                .from('doc_seg')
                .update({
                    status: editData.status,
                    valor: editData.valor,
                    data_recebimento: editData.data_recebimento,
                    prazo: editData.prazo,
                    data_entrega: editData.data_entrega,
                    enviado: editData.enviado,
                    obs: editData.obs,
                    faturado: editData.faturado // Save the billed status
                })
                .eq('id', selectedDoc.id);

            if (error) throw error;

            setSelectedDoc(null);
            fetchData();
        } catch (error: any) {
            alert("Erro ao atualizar: " + error.message);
        }
    };

    const handleDelete = async () => {
        // ... logic handled by executeDelete via modal
        setShowDeleteConfirm(true);
    };

    const executeDelete = async () => {
        if (!selectedDoc) return;
        const idToDelete = selectedDoc.id;
        console.group("🗑️ Executando Exclusão (Modal)");
        try {
            const { data, error, count } = await supabase
                .from('doc_seg')
                .delete()
                .eq('id', idToDelete)
                .select();

            if (error) throw error;
            setShowDeleteConfirm(false);
            setSelectedDoc(null);
            fetchData();
        } catch (error: any) {
            alert("Erro ao excluir: " + error.message);
            setShowDeleteConfirm(false);
        } finally {
            console.groupEnd();
        }
    };

    const groupedDocs = useMemo(() => {
        const groups: { [key: number]: any[] } = {};

        // Vamos manter um rastreamento dos grupos psicossociais por mês e empresa
        const psicoTrack: { [mes: number]: { [empresa: number]: { count: number; docIndex: number; baseDoc: DocSeg; docs: DocSeg[] } } } = {};

        documents.forEach((doc, index) => {
            const m = doc.mes;
            if (!groups[m]) groups[m] = [];

            if (doc.doc === 576 || doc.doc === 577) {
                if (!psicoTrack[m]) psicoTrack[m] = {};

                if (!psicoTrack[m][doc.empresa]) {
                    // Primeiro que encontramos (que na verdade é o mais recente, pois a query original é order_by created_at desc)
                    psicoTrack[m][doc.empresa] = {
                        count: 1,
                        docIndex: groups[m].length, // Posição que ele ficará no array deste mês
                        baseDoc: doc,
                        docs: [doc]
                    };
                    // Inserimos um objeto especial que servirá como o card agrupado
                    groups[m].push({
                        isPsicossocialGroup: true,
                        empresaId: doc.empresa,
                        nome_unidade: doc.unidades?.nome_unidade || 'Empresa desconhecida',
                        count: 1,
                        baseDoc: doc,
                        docs: [doc]
                    });
                } else {
                    // Já existe um card de grupo para esta empresa neste mês, apenas incrementamos o contador
                    psicoTrack[m][doc.empresa].count += 1;
                    psicoTrack[m][doc.empresa].docs.push(doc);
                    // E atualizamos a propriedade 'count' do objeto já inserido no array
                    groups[m][psicoTrack[m][doc.empresa].docIndex].count = psicoTrack[m][doc.empresa].count;
                    groups[m][psicoTrack[m][doc.empresa].docIndex].docs = psicoTrack[m][doc.empresa].docs;
                }
            } else {
                // Documentos normais
                groups[m].push(doc);
            }
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
                    <div className="flex gap-3">
                        <Button onClick={() => setShowGenerateModal(true)} variant="secondary" className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">
                            <FilePlus size={18} strokeWidth={2.5} />
                            <span>Gerar documento</span>
                        </Button>
                        <Button onClick={() => setShowCreateModal(true)} className="shadow-blue-500/20">
                            <Plus size={18} strokeWidth={2.5} />
                            <span>Novo Documento</span>
                        </Button>
                    </div>
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
                            const itemsInMonth = groupedDocs[month].filter(item => {
                                if (item.isPsicossocialGroup) {
                                    const matchesSearch =
                                        item.nome_unidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        'psicossocial'.includes(searchTerm.toLowerCase());
                                    return matchesSearch;
                                }

                                const doc = item as DocSeg;
                                const matchesSearch =
                                    doc.unidades?.nome_unidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    doc.procedimento?.nome.toLowerCase().includes(searchTerm.toLowerCase());

                                const matchesStatus = statusFilter === 'Todos' || doc.status === statusFilter;

                                return matchesSearch && matchesStatus;
                            });

                            if (itemsInMonth.length === 0) return null;

                            return (
                                <div key={month} className="animate-fade-in-up">
                                    <div className="flex items-center gap-3 mb-6 ml-2">
                                        <div className="w-1.5 h-6 bg-ios-blue rounded-full"></div>
                                        <h2 className="text-xl font-bold text-gray-800">{MONTHS[month - 1]}</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {itemsInMonth.map((item, index) => {
                                            if (item.isPsicossocialGroup) {
                                                return (
                                                    <div
                                                        key={`psico-${item.empresaId}-${month}-${index}`}
                                                        className="group cursor-pointer"
                                                        onClick={() => setSelectedPsicoGroup({ empresaId: item.empresaId, nome_unidade: item.nome_unidade, docs: item.docs })}
                                                    >
                                                        <Card className="hover:-translate-y-1 hover:shadow-ios-float transition-all duration-300 relative overflow-hidden h-full flex flex-col ring-1 ring-purple-100 bg-purple-50/10">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                                                                    <Activity size={20} strokeWidth={2.5} />
                                                                </div>
                                                                <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                                                                    {item.count} avaliações
                                                                </div>
                                                            </div>

                                                            <h3 className="font-bold text-[17px] text-gray-900 leading-snug mb-1" title={item.nome_unidade}>
                                                                {item.nome_unidade}
                                                            </h3>

                                                            <div className="text-sm text-purple-600 font-bold mb-auto">
                                                                Psicossocial
                                                            </div>
                                                        </Card>
                                                    </div>
                                                );
                                            }

                                            const doc = item as DocSeg;
                                            return (
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
                                                            <div className="flex items-center gap-2">
                                                                {doc.obs && (
                                                                    <div title="Possui observação" className="bg-yellow-50 text-yellow-600 p-1 rounded-md">
                                                                        <AlignLeft size={10} />
                                                                    </div>
                                                                )}
                                                                {doc.faturado && (
                                                                    <div title="Faturado" className="bg-green-100 text-green-700 p-1 rounded-md">
                                                                        <DollarSign size={10} />
                                                                    </div>
                                                                )}
                                                                <div className="text-gray-900 font-semibold">
                                                                    {doc.valor ? `R$ ${doc.valor.toFixed(2)}` : 'R$ 0,00'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </div>
                                            );
                                        })}
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
                                        icon={<Building2 size={18} />}
                                        value={createData.empresa}
                                        onChange={e => setCreateData({ ...createData, empresa: e.target.value })}
                                    >
                                        <option value="">Selecione uma empresa</option>
                                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nome_unidade}</option>)}
                                    </Select>

                                    <Select
                                        label="Tipo de Documento"
                                        icon={<FileIcon size={18} />}
                                        value={createData.doc}
                                        onChange={e => setCreateData({ ...createData, doc: e.target.value })}
                                    >
                                        <option value="">Selecione o tipo</option>
                                        {filteredProcedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                    </Select>

                                    <Select
                                        label="Mês de Referência"
                                        icon={<Calendar size={18} />}
                                        value={createData.mes}
                                        onChange={e => setCreateData({ ...createData, mes: parseInt(e.target.value) })}
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
                                                onChange={e => setCreateData({ ...createData, data_recebimento: e.target.value })}
                                            />
                                            <Input
                                                label="Prazo"
                                                type="date"
                                                className="bg-white"
                                                value={createData.prazo}
                                                onChange={e => setCreateData({ ...createData, prazo: e.target.value })}
                                            />
                                        </div>
                                        <Input
                                            label="Valor do Serviço"
                                            type="number"
                                            step="0.01"
                                            icon={<DollarSign size={16} />}
                                            className="bg-white"
                                            placeholder="0,00"
                                            value={createData.valor}
                                            onChange={e => setCreateData({ ...createData, valor: parseFloat(e.target.value) })}
                                        />
                                    </div>

                                    <Select
                                        label="Status Inicial"
                                        icon={<AlertCircle size={18} />}
                                        value={createData.status}
                                        onChange={e => setCreateData({ ...createData, status: e.target.value })}
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
                                            onChange={e => setCreateData({ ...createData, obs: e.target.value })}
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
                                    onClick={handleDelete}
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
                                    onChange={e => setEditData({ ...editData, status: e.target.value })}
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
                                    icon={<DollarSign size={16} />}
                                    value={editData.valor || 0}
                                    onChange={e => setEditData({ ...editData, valor: parseFloat(e.target.value) })}
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
                                        onChange={e => setEditData({ ...editData, data_recebimento: e.target.value })}
                                    />
                                    <Input
                                        label="Prazo"
                                        type="date"
                                        className="bg-white"
                                        value={editData.prazo ? new Date(editData.prazo).toISOString().split('T')[0] : ''}
                                        onChange={e => setEditData({ ...editData, prazo: e.target.value })}
                                    />
                                </div>

                                <div className="pt-2 border-t border-gray-200/50">
                                    <Input
                                        label="Data de Entrega"
                                        type="date"
                                        className="bg-white"
                                        value={editData.data_entrega ? new Date(editData.data_entrega).toISOString().split('T')[0] : ''}
                                        onChange={e => setEditData({ ...editData, data_entrega: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Billing Section - In Edit Modal */}
                            <div className={`p-5 rounded-2xl border transition-all duration-300 ${editData.faturado ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${editData.faturado ? 'text-ios-blue' : 'text-gray-400'}`}>
                                        <Wallet size={12} /> Faturamento
                                    </h3>
                                    <Toggle
                                        label={editData.faturado ? "Faturado" : "Gerar Faturamento"}
                                        checked={editData.faturado || false}
                                        onChange={(val) => {
                                            if (selectedDoc.faturado && !val) {
                                                alert("Não é possível cancelar o faturamento por aqui. Contate o suporte.");
                                                return;
                                            }
                                            setEditData({ ...editData, faturado: val })
                                        }}
                                    />
                                </div>

                                {editData.faturado && !selectedDoc.faturado && (
                                    <div className="animate-fade-in space-y-4 pt-2">
                                        <div>
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1 mb-2 block">Empresa Responsável</label>
                                            <div className="flex gap-2">
                                                {['Gama Medicina', 'Gama Soluções'].map(emp => (
                                                    <label key={emp} className={`flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border shadow-sm flex-1 justify-center transition-all ${editData.empresaResp === emp ? 'border-ios-blue ring-1 ring-ios-blue' : 'border-blue-100 hover:bg-blue-50'}`}>
                                                        <input
                                                            type="radio"
                                                            name="empresaRespEdit"
                                                            className="hidden"
                                                            checked={editData.empresaResp === emp}
                                                            onChange={() => setEditData({ ...editData, empresaResp: emp })}
                                                        />
                                                        <span className={`text-xs font-medium ${editData.empresaResp === emp ? 'text-ios-blue' : 'text-gray-600'}`}>{emp}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <Toggle
                                                label="Parcelado?"
                                                checked={editData.isParcelado || false}
                                                onChange={(val) => setEditData({ ...editData, isParcelado: val })}
                                            />
                                            {editData.isParcelado && (
                                                <div className="flex-1 animate-fade-in">
                                                    <Input
                                                        label="Qtd. Parcelas"
                                                        type="number"
                                                        min="2"
                                                        max="48"
                                                        className="bg-white border-blue-200 focus:border-blue-400 mb-0"
                                                        value={editData.qntParcelas}
                                                        onChange={e => setEditData({ ...editData, qntParcelas: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-blue-500 bg-blue-100/50 p-2 rounded-lg">
                                            Ao salvar, um registro financeiro será criado automaticamente.
                                        </p>
                                    </div>
                                )}
                                {selectedDoc.faturado && (
                                    <div className="text-xs text-green-600 font-medium flex items-center gap-2 bg-green-50 p-2 rounded-lg">
                                        <CheckCircle2 size={12} /> Financeiro já gerado para este documento.
                                    </div>
                                )}
                            </div>

                            <div className="w-full">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 ml-1 mb-1.5 flex items-center gap-1"><AlignLeft size={10} /> Observações</label>
                                <textarea
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:border-ios-blue focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none h-24"
                                    placeholder="Observações sobre o documento..."
                                    value={editData.obs || ''}
                                    onChange={e => setEditData({ ...editData, obs: e.target.value })}
                                />
                            </div>

                            <Toggle
                                label="Documento Enviado"
                                description="Marque se o documento já foi enviado ao cliente."
                                checked={editData.enviado || false}
                                onChange={(val) => setEditData({ ...editData, enviado: val })}
                            />
                        </div>

                        <div className="p-5 border-t border-gray-100 flex gap-3">
                            <Button variant="ghost" className="flex-1" onClick={() => setSelectedDoc(null)}>Fechar</Button>
                            <Button className="flex-1" onClick={handleUpdate}>Salvar Alterações</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modal de Detalhes Psicossocial */}
            {selectedPsicoGroup && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-2xl overflow-hidden animate-scale-in p-0 shadow-2xl">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-purple-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 leading-tight">Avaliações Psicossociais</h2>
                                <p className="text-purple-600 text-sm mt-1 font-semibold flex items-center gap-1.5">
                                    <Building2 size={14} /> {selectedPsicoGroup.nome_unidade}
                                </p>
                            </div>
                            <button onClick={() => setSelectedPsicoGroup(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                                <span className="text-2xl leading-none">&times;</span>
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                            {selectedPsicoGroup.docs.map(doc => (
                                <div key={doc.id} className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                                <Activity size={16} className="text-purple-500" />
                                                {doc.procedimento?.nome}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Recebido em: {new Date(doc.data_recebimento).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Badge status={doc.status} />
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-medium text-gray-600 mt-4 border-t pt-3 border-gray-50">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={12} className="text-gray-400" />
                                            Prazo: {new Date(doc.prazo).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <DollarSign size={12} className="text-green-500" />
                                            {doc.valor ? `R$ ${doc.valor.toFixed(2)}` : 'R$ 0,00'}
                                        </div>
                                        {doc.obs && (
                                            <div className="flex items-center gap-1.5 ml-auto text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded" title={doc.obs}>
                                                <AlignLeft size={12} /> Obs
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <Button size="sm" variant="ghost" className="text-ios-blue text-xs hover:bg-blue-50" onClick={() => {
                                            setSelectedPsicoGroup(null);
                                            setSelectedDoc(doc);
                                        }}>
                                            Ver Detalhes Documento
                                        </Button>
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

            {/* Generate Document Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-4xl overflow-hidden animate-scale-in p-0 shadow-2xl relative">
                        <button onClick={() => setShowGenerateModal(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all z-10">
                            <span className="text-xl leading-none">&times;</span>
                        </button>
                        <div className="p-10 text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-10">Gerar Documento Automático</h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* PGR Card - Locked */}
                                <div className="group relative p-8 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center gap-4 transition-all opacity-75">
                                    <div className="absolute top-4 right-4 text-gray-300">
                                        <Lock size={16} />
                                    </div>
                                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 mb-2">
                                        <HardHat size={32} strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-500">PGR</h3>
                                    <span className="px-3 py-1 bg-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                        Em Desenvolvimento
                                    </span>
                                </div>

                                {/* PCMSO Card - Active */}
                                <div
                                    onClick={() => {
                                        setShowGenerateModal(false);
                                        setShowPcmsoModal(true);
                                    }}
                                    className="group relative p-8 rounded-3xl border-2 border-blue-100 bg-white shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 hover:-translate-y-1 hover:border-ios-blue transition-all cursor-pointer flex flex-col items-center justify-center gap-4"
                                >
                                    <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-ios-blue mb-2 group-hover:scale-110 transition-transform duration-300">
                                        <Activity size={32} strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">PCMSO</h3>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                        Disponível
                                    </span>
                                </div>

                                {/* LTCAT Card - Locked */}
                                <div className="group relative p-8 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center gap-4 transition-all opacity-75">
                                    <div className="absolute top-4 right-4 text-gray-300">
                                        <Lock size={16} />
                                    </div>
                                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 mb-2">
                                        <FileIcon size={32} strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-500">LTCAT</h3>
                                    <span className="px-3 py-1 bg-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                        Em Desenvolvimento
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* PCMSO Generation Modal */}
            {showPcmsoModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-2xl overflow-hidden animate-scale-in p-0 shadow-2xl">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-ios-blue">
                                    <Activity size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Gerar PCMSO</h2>
                            </div>
                            <button onClick={() => setShowPcmsoModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all">
                                <span className="text-xl leading-none">&times;</span>
                            </button>
                        </div>

                        <div className="p-8 min-h-[400px] flex flex-col justify-center">
                            <div className="max-w-md mx-auto w-full space-y-6">
                                <div className="text-center mb-8">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Selecione a Empresa</label>
                                    <Select
                                        label=""
                                        icon={<Building2 size={18} />}
                                        value={createData.empresa} // Reusing creation state for simplicity, or we can make a new one
                                        onChange={e => setCreateData({ ...createData, empresa: e.target.value })}
                                        className="text-lg py-3"
                                    >
                                        <option value="">Selecione uma empresa...</option>
                                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nome_unidade}</option>)}
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <Button className="px-8 shadow-blue-500/20" onClick={() => {
                                setShowPcmsoModal(false);
                                setShowCompanyDataModal(true);
                            }}>
                                Próximo <ArrowRight size={16} className="ml-2" />
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Company Data Form Modal */}
            {showCompanyDataModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-scale-in p-0 shadow-2xl relative">
                        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-xl shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-ios-blue">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Dados da Empresa</h2>
                                    <p className="text-xs text-gray-500">Confirme as informações para o PCMSO</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCompanyDataModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all">
                                <span className="text-xl leading-none">&times;</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/50">
                            {/* 1. Basic Info */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center justify-between border-b border-gray-50 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={14} /> Dados Cadastrais
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className="h-8 text-[11px] text-ios-blue hover:bg-blue-50 px-3"
                                        onClick={pullCompanyData}
                                    >
                                        <RefreshCw size={12} className="mr-1.5" /> Puxar Dados
                                    </Button>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="Razão Social"
                                        value={companyFormData.razao_social}
                                        onChange={e => setCompanyFormData({ ...companyFormData, razao_social: e.target.value })}
                                        className="bg-gray-50"
                                    />
                                    <Input
                                        label="Nome Fantasia"
                                        value={companyFormData.nome_fantasia}
                                        onChange={e => setCompanyFormData({ ...companyFormData, nome_fantasia: e.target.value })}
                                        className="bg-gray-50"
                                    />
                                    <Input
                                        label="CNPJ"
                                        value={companyFormData.cnpj}
                                        onChange={e => setCompanyFormData({ ...companyFormData, cnpj: e.target.value })}
                                        className="bg-gray-50"
                                    />
                                    <Input
                                        label="Inscrição Estadual"
                                        value={companyFormData.inscricao_estadual}
                                        onChange={e => setCompanyFormData({ ...companyFormData, inscricao_estadual: e.target.value })}
                                        className="bg-gray-50"
                                    />
                                </div>
                            </div>

                            {/* 2. Address */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-50 pb-2">
                                    <Briefcase size={14} /> Endereço
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Logradouro"
                                            value={companyFormData.endereco.logradouro}
                                            onChange={e => setCompanyFormData({ ...companyFormData, endereco: { ...companyFormData.endereco, logradouro: e.target.value } })}
                                            className="bg-gray-50"
                                        />
                                    </div>
                                    <Input
                                        label="Número"
                                        value={companyFormData.endereco.numero}
                                        onChange={e => setCompanyFormData({ ...companyFormData, endereco: { ...companyFormData.endereco, numero: e.target.value } })}
                                        className="bg-gray-50"
                                    />
                                    <Input
                                        label="Complemento"
                                        value={companyFormData.endereco.complemento}
                                        onChange={e => setCompanyFormData({ ...companyFormData, endereco: { ...companyFormData.endereco, complemento: e.target.value } })}
                                        className="bg-gray-50"
                                    />
                                    <Input
                                        label="Bairro"
                                        value={companyFormData.endereco.bairro}
                                        onChange={e => setCompanyFormData({ ...companyFormData, endereco: { ...companyFormData.endereco, bairro: e.target.value } })}
                                        className="bg-gray-50"
                                    />
                                    <Input
                                        label="CEP"
                                        value={companyFormData.endereco.cep}
                                        onChange={e => setCompanyFormData({ ...companyFormData, endereco: { ...companyFormData.endereco, cep: e.target.value } })}
                                        className="bg-gray-50"
                                    />
                                    <Input
                                        label="Cidade"
                                        value={companyFormData.endereco.cidade}
                                        onChange={e => setCompanyFormData({ ...companyFormData, endereco: { ...companyFormData.endereco, cidade: e.target.value } })}
                                        className="bg-gray-50"
                                    />
                                    <Input
                                        label="Estado (UF)"
                                        value={companyFormData.endereco.estado}
                                        onChange={e => setCompanyFormData({ ...companyFormData, endereco: { ...companyFormData.endereco, estado: e.target.value } })}
                                        className="bg-gray-50"
                                    />
                                </div>
                            </div>

                            {/* 3. CNAE & Activity */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-50 pb-2">
                                    <Layers size={14} /> Atividade Econômica (CNAE)
                                </h3>

                                <div className="space-y-6">
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                        <label className="text-xs font-bold text-blue-600 uppercase mb-3 block">CNAE Principal</label>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <Input
                                                label="Código"
                                                value={companyFormData.cnae.codigo}
                                                onChange={e => setCompanyFormData({ ...companyFormData, cnae: { ...companyFormData.cnae, codigo: e.target.value } })}
                                                className="bg-white"
                                            />
                                            <div className="md:col-span-3">
                                                <Input
                                                    label="Descrição"
                                                    value={companyFormData.cnae.descricao}
                                                    onChange={e => setCompanyFormData({ ...companyFormData, cnae: { ...companyFormData.cnae, descricao: e.target.value } })}
                                                    className="bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-gray-400 uppercase block">CNAEs Secundários</label>
                                        {companyFormData.cnaes.secundarios.map((cnae, index) => (
                                            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <Input
                                                    label="Código"
                                                    value={cnae.codigo}
                                                    onChange={e => {
                                                        const newSec = [...companyFormData.cnaes.secundarios];
                                                        newSec[index].codigo = e.target.value;
                                                        setCompanyFormData({ ...companyFormData, cnaes: { ...companyFormData.cnaes, secundarios: newSec } });
                                                    }}
                                                    className="bg-white"
                                                />
                                                <div className="md:col-span-3 relative">
                                                    <Input
                                                        label="Descrição"
                                                        value={cnae.descricao}
                                                        onChange={e => {
                                                            const newSec = [...companyFormData.cnaes.secundarios];
                                                            newSec[index].descricao = e.target.value;
                                                            setCompanyFormData({ ...companyFormData, cnaes: { ...companyFormData.cnaes, secundarios: newSec } });
                                                        }}
                                                        className="bg-white"
                                                    />
                                                    {companyFormData.cnaes.secundarios.length > 1 && (
                                                        <button
                                                            onClick={() => {
                                                                const newSec = companyFormData.cnaes.secundarios.filter((_, i) => i !== index);
                                                                setCompanyFormData({ ...companyFormData, cnaes: { ...companyFormData.cnaes, secundarios: newSec } });
                                                            }}
                                                            className="absolute -right-2 -top-2 bg-red-100 text-red-500 rounded-full p-1 hover:bg-red-200 transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        <Button
                                            variant="ghost"
                                            className="text-ios-blue text-xs hover:bg-blue-50"
                                            onClick={() => setCompanyFormData({
                                                ...companyFormData,
                                                cnaes: {
                                                    ...companyFormData.cnaes,
                                                    secundarios: [...companyFormData.cnaes.secundarios, { codigo: '', descricao: '' }]
                                                }
                                            })}
                                        >
                                            <Plus size={12} className="mr-1" /> Adicionar CNAE Secundário
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Operational & Responsive Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-50 pb-2">
                                        <Activity size={14} /> Dados Operacionais
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Grau de Risco"
                                                value={companyFormData.grau_risco}
                                                onChange={e => setCompanyFormData({ ...companyFormData, grau_risco: e.target.value })}
                                                className="bg-gray-50"
                                            />
                                            <Input
                                                label="Ramo de Atividade"
                                                value={companyFormData.ramo_atividade}
                                                onChange={e => setCompanyFormData({ ...companyFormData, ramo_atividade: e.target.value })}
                                                className="bg-gray-50"
                                            />
                                        </div>
                                        <Input
                                            label="Horário de Expediente"
                                            value={companyFormData.horario_expediente}
                                            onChange={e => setCompanyFormData({ ...companyFormData, horario_expediente: e.target.value })}
                                            className="bg-gray-50"
                                        />
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-50 pb-2">
                                        <HardHat size={14} /> Responsável Implantação
                                    </h3>
                                    <div className="space-y-4">
                                        <Input
                                            label="Nome"
                                            value={companyFormData.responsavel_implantacao.nome}
                                            onChange={e => setCompanyFormData({ ...companyFormData, responsavel_implantacao: { ...companyFormData.responsavel_implantacao, nome: e.target.value } })}
                                            className="bg-gray-50"
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Cargo"
                                                value={companyFormData.responsavel_implantacao.cargo}
                                                onChange={e => setCompanyFormData({ ...companyFormData, responsavel_implantacao: { ...companyFormData.responsavel_implantacao, cargo: e.target.value } })}
                                                className="bg-gray-50"
                                            />
                                            <Input
                                                label="Registro (CREA/MTE)"
                                                value={companyFormData.responsavel_implantacao.registro}
                                                onChange={e => setCompanyFormData({ ...companyFormData, responsavel_implantacao: { ...companyFormData.responsavel_implantacao, registro: e.target.value } })}
                                                className="bg-gray-50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="p-6 bg-white border-t border-gray-100 flex justify-between shrink-0 z-10">
                            <Button variant="ghost" onClick={() => {
                                setShowCompanyDataModal(false);
                                setShowPcmsoModal(true);
                            }}>
                                <ArrowRight size={16} className="mr-2 rotate-180" /> Voltar
                            </Button>
                            <Button className="px-8 shadow-blue-500/20" onClick={() => {
                                setShowCompanyDataModal(false);
                                setShowPcmsoConfigModal(true);
                            }}>
                                Próximo <ArrowRight size={16} className="ml-2" />
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* PCMSO Configuration Modal */}
            {showPcmsoConfigModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-lg overflow-hidden animate-scale-in p-0 shadow-2xl rounded-[40px]">
                        <div className="px-8 py-6 flex justify-between items-center relative">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                    <Plus size={20} className="rotate-45" />
                                    <div className="absolute -top-1 -right-1">
                                        {/* Mocking the user icon with plus as seen in image */}
                                    </div>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Configuração do PCMSO</h2>
                            </div>
                            <button onClick={() => setShowPcmsoConfigModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all">
                                <span className="text-xl leading-none">&times;</span>
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100/50">
                                <h3 className="text-sm font-bold text-purple-700 mb-1">Definição de Responsáveis</h3>
                                <p className="text-[11px] text-purple-500 font-medium">
                                    Informe os profissionais responsáveis pela implantação e elaboração documental.
                                </p>
                            </div>

                            {/* Responsável pela Implantação */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsável pela Implantação</label>
                                </div>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Nome do responsável..."
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-purple-500 outline-none transition-shadow text-sm"
                                        value={companyFormData.responsavel_implantacao.nome}
                                        onChange={e => setCompanyFormData({ ...companyFormData, responsavel_implantacao: { ...companyFormData.responsavel_implantacao, nome: e.target.value } })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Cargo</label>
                                        <input
                                            type="text"
                                            placeholder="Responsável Técnico"
                                            className="w-full px-4 py-3.5 bg-white rounded-2xl border border-gray-100 focus:border-purple-200 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all text-sm"
                                            value={companyFormData.responsavel_implantacao.cargo}
                                            onChange={e => setCompanyFormData({ ...companyFormData, responsavel_implantacao: { ...companyFormData.responsavel_implantacao, cargo: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-1.5 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Registro</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: MTE 000"
                                            className="w-full px-4 py-3.5 bg-white rounded-2xl border border-gray-100 focus:border-purple-200 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all text-sm"
                                            value={companyFormData.responsavel_implantacao.registro}
                                            onChange={e => setCompanyFormData({ ...companyFormData, responsavel_implantacao: { ...companyFormData.responsavel_implantacao, registro: e.target.value } })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Responsável pela Elaboração do PGR */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Responsável pela Elaboração do PGR</label>
                                </div>
                                <div className="relative">
                                    <FileIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Nome do responsável técnico..."
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-purple-500 outline-none transition-shadow text-sm"
                                        value={companyFormData.responsavel_elaboracao_pgr.nome}
                                        onChange={e => setCompanyFormData({ ...companyFormData, responsavel_elaboracao_pgr: { ...companyFormData.responsavel_elaboracao_pgr, nome: e.target.value } })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Cargo</label>
                                        <input
                                            type="text"
                                            placeholder="Técnico de Seg. do Traba"
                                            className="w-full px-4 py-3.5 bg-white rounded-2xl border border-gray-100 focus:border-purple-200 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all text-sm"
                                            value={companyFormData.responsavel_elaboracao_pgr.cargo}
                                            onChange={e => setCompanyFormData({ ...companyFormData, responsavel_elaboracao_pgr: { ...companyFormData.responsavel_elaboracao_pgr, cargo: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-1.5 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Registro</label>
                                        <input
                                            type="text"
                                            placeholder="MTE 0000000"
                                            className="w-full px-4 py-3.5 bg-white rounded-2xl border border-gray-100 focus:border-purple-200 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all text-sm"
                                            value={companyFormData.responsavel_elaboracao_pgr.registro}
                                            onChange={e => setCompanyFormData({ ...companyFormData, responsavel_elaboracao_pgr: { ...companyFormData.responsavel_elaboracao_pgr, registro: e.target.value } })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 pt-4 flex gap-4">
                            <Button variant="ghost" className="flex-1 text-ios-blue hover:bg-gray-50 rounded-2xl" onClick={() => setShowPcmsoConfigModal(false)}>
                                Cancelar
                            </Button>
                            <Button className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] shadow-purple-500/20 rounded-2xl" onClick={() => {
                                setShowPcmsoConfigModal(false);
                                setShowMedicalDataModal(true);
                            }}>
                                Próximo
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Medical Data Modal */}
            {showMedicalDataModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-scale-in p-0 shadow-2xl">
                        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-xl shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-ios-blue">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Dados Médicos</h2>
                                    <p className="text-xs text-gray-500">Informações dos médicos responsáveis e examinadores</p>
                                </div>
                            </div>
                            <button onClick={() => setShowMedicalDataModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all">
                                <span className="text-xl leading-none">&times;</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/50">
                            {/* Médico Responsável Section */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-50 pb-2">
                                    <Plus size={14} className="text-ios-blue" /> Médico Responsável
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <Input
                                        label="Nome da Médica/Médico"
                                        value={companyFormData.medico_responsavel.nome}
                                        onChange={e => setCompanyFormData({ ...companyFormData, medico_responsavel: { ...companyFormData.medico_responsavel, nome: e.target.value } })}
                                        className="bg-gray-50"
                                    />
                                    <Input
                                        label="CRM"
                                        placeholder="Ex: CRM-SP 123456"
                                        value={companyFormData.medico_responsavel.crm}
                                        onChange={e => setCompanyFormData({ ...companyFormData, medico_responsavel: { ...companyFormData.medico_responsavel, crm: e.target.value } })}
                                        className="bg-gray-50"
                                    />
                                    <Input
                                        label="RQE"
                                        placeholder="Ex: RQE 98765"
                                        value={companyFormData.medico_responsavel.rqe}
                                        onChange={e => setCompanyFormData({ ...companyFormData, medico_responsavel: { ...companyFormData.medico_responsavel, rqe: e.target.value } })}
                                        className="bg-gray-50"
                                    />
                                </div>

                                <div className="mt-8">
                                    <h4 className="text-[11px] font-bold text-gray-400 uppercase mb-4">Endereço Profissional</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="md:col-span-2">
                                            <Input
                                                label="Logradouro"
                                                value={companyFormData.medico_responsavel.endereco_profissional.logradouro}
                                                onChange={e => setCompanyFormData({ ...companyFormData, medico_responsavel: { ...companyFormData.medico_responsavel, endereco_profissional: { ...companyFormData.medico_responsavel.endereco_profissional, logradouro: e.target.value } } })}
                                                className="bg-gray-50"
                                            />
                                        </div>
                                        <Input
                                            label="Número"
                                            value={companyFormData.medico_responsavel.endereco_profissional.numero}
                                            onChange={e => setCompanyFormData({ ...companyFormData, medico_responsavel: { ...companyFormData.medico_responsavel, endereco_profissional: { ...companyFormData.medico_responsavel.endereco_profissional, numero: e.target.value } } })}
                                            className="bg-gray-50"
                                        />
                                        <Input
                                            label="Complemento"
                                            value={companyFormData.medico_responsavel.endereco_profissional.complemento}
                                            onChange={e => setCompanyFormData({ ...companyFormData, medico_responsavel: { ...companyFormData.medico_responsavel, endereco_profissional: { ...companyFormData.medico_responsavel.endereco_profissional, complemento: e.target.value } } })}
                                            className="bg-gray-50"
                                        />
                                        <Input
                                            label="Bairro"
                                            value={companyFormData.medico_responsavel.endereco_profissional.bairro}
                                            onChange={e => setCompanyFormData({ ...companyFormData, medico_responsavel: { ...companyFormData.medico_responsavel, endereco_profissional: { ...companyFormData.medico_responsavel.endereco_profissional, bairro: e.target.value } } })}
                                            className="bg-gray-50"
                                        />
                                        <Input
                                            label="CEP"
                                            value={companyFormData.medico_responsavel.endereco_profissional.cep}
                                            onChange={e => setCompanyFormData({ ...companyFormData, medico_responsavel: { ...companyFormData.medico_responsavel, endereco_profissional: { ...companyFormData.medico_responsavel.endereco_profissional, cep: e.target.value } } })}
                                            className="bg-gray-50"
                                        />
                                        <Input
                                            label="Cidade"
                                            value={companyFormData.medico_responsavel.endereco_profissional.cidade}
                                            onChange={e => setCompanyFormData({ ...companyFormData, medico_responsavel: { ...companyFormData.medico_responsavel, endereco_profissional: { ...companyFormData.medico_responsavel.endereco_profissional, cidade: e.target.value } } })}
                                            className="bg-gray-50"
                                        />
                                        <div className="md:col-span-1">
                                            <Input
                                                label="Estado"
                                                value={companyFormData.medico_responsavel.endereco_profissional.estado}
                                                onChange={e => setCompanyFormData({ ...companyFormData, medico_responsavel: { ...companyFormData.medico_responsavel, endereco_profissional: { ...companyFormData.medico_responsavel.endereco_profissional, estado: e.target.value } } })}
                                                className="bg-gray-50"
                                            />
                                        </div>
                                        <Input
                                            label="Telefone"
                                            placeholder="+55 (11) 99999-9999"
                                            value={companyFormData.medico_responsavel.telefone}
                                            onChange={e => setCompanyFormData({ ...companyFormData, medico_responsavel: { ...companyFormData.medico_responsavel, telefone: e.target.value } })}
                                            className="bg-gray-50"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Médicos Examinadores Section */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-2">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <Activity size={14} className="text-ios-blue" /> Médicos Examinadores
                                    </h3>
                                    <Button
                                        variant="ghost"
                                        className="text-ios-blue text-xs"
                                        onClick={() => setCompanyFormData({ ...companyFormData, medicos_examinadores: [...companyFormData.medicos_examinadores, { nome: "", crm: "" }] })}
                                    >
                                        <Plus size={14} className="mr-1" /> Adicionar Examinador
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {companyFormData.medicos_examinadores.map((medico, index) => (
                                        <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                                            <Input
                                                label="Nome do Examinador"
                                                value={medico.nome}
                                                onChange={e => {
                                                    const newEx = [...companyFormData.medicos_examinadores];
                                                    newEx[index].nome = e.target.value;
                                                    setCompanyFormData({ ...companyFormData, medicos_examinadores: newEx });
                                                }}
                                                className="bg-white"
                                            />
                                            <Input
                                                label="CRM"
                                                value={medico.crm}
                                                onChange={e => {
                                                    const newEx = [...companyFormData.medicos_examinadores];
                                                    newEx[index].crm = e.target.value;
                                                    setCompanyFormData({ ...companyFormData, medicos_examinadores: newEx });
                                                }}
                                                className="bg-white"
                                            />
                                            {companyFormData.medicos_examinadores.length > 1 && (
                                                <button
                                                    onClick={() => {
                                                        const newEx = companyFormData.medicos_examinadores.filter((_, i) => i !== index);
                                                        setCompanyFormData({ ...companyFormData, medicos_examinadores: newEx });
                                                    }}
                                                    className="absolute -right-2 -top-2 bg-red-100 text-red-500 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-200"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-white border-t border-gray-100 flex justify-between shrink-0">
                            <Button variant="ghost" onClick={() => {
                                setShowMedicalDataModal(false);
                                setShowPcmsoConfigModal(true);
                            }}>
                                <ArrowRight size={16} className="mr-2 rotate-180" /> Voltar
                            </Button>
                            <Button className="px-8 shadow-blue-500/20" onClick={() => {
                                setShowMedicalDataModal(false);
                                setShowScheduleModal(true);
                            }}>
                                Próximo <ArrowRight size={16} className="ml-2" />
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Schedule of Actions Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden animate-scale-in p-0 shadow-2xl rounded-[40px]">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-xl shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Calendar size={20} />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Cronograma de Ações</h2>
                            </div>
                            <button onClick={() => setShowScheduleModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all">
                                <span className="text-xl leading-none">&times;</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/50">
                            {/* 1. Vigência e Emissão Section */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 pb-2">
                                    <Activity size={14} className="text-indigo-600" /> Vigência e Emissão
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1.5 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Início Vigência</label>
                                        <input
                                            type="text"
                                            placeholder="DD/MM/AAAA"
                                            className="w-full px-4 py-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm"
                                            value={companyFormData.vigencia_emissao.inicio}
                                            onChange={e => setCompanyFormData({ ...companyFormData, vigencia_emissao: { ...companyFormData.vigencia_emissao, inicio: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-1.5 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Fim Vigência</label>
                                        <input
                                            type="text"
                                            placeholder="DD/MM/AAAA"
                                            className="w-full px-4 py-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm"
                                            value={companyFormData.vigencia_emissao.fim}
                                            onChange={e => setCompanyFormData({ ...companyFormData, vigencia_emissao: { ...companyFormData.vigencia_emissao, fim: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-1.5 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Data Emissão</label>
                                        <input
                                            type="text"
                                            placeholder="DD/MM/AAAA"
                                            className="w-full px-4 py-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm"
                                            value={companyFormData.vigencia_emissao.data_emissao}
                                            onChange={e => setCompanyFormData({ ...companyFormData, vigencia_emissao: { ...companyFormData.vigencia_emissao, data_emissao: e.target.value } })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Dados da Revisão Section */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 pb-2">
                                    <Layers size={14} className="text-indigo-600" /> Dados da Revisão
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1.5 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">N° Revisão</label>
                                        <input
                                            type="text"
                                            placeholder="00"
                                            className="w-full px-4 py-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm"
                                            value={companyFormData.cronograma_revisao.numero}
                                            onChange={e => setCompanyFormData({ ...companyFormData, cronograma_revisao: { ...companyFormData.cronograma_revisao, numero: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-1.5 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Data Revisão</label>
                                        <input
                                            type="text"
                                            placeholder="DD/MM/AAAA"
                                            className="w-full px-4 py-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm"
                                            value={companyFormData.cronograma_revisao.data}
                                            onChange={e => setCompanyFormData({ ...companyFormData, cronograma_revisao: { ...companyFormData.cronograma_revisao, data: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-1.5 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Item Revisado</label>
                                        <input
                                            type="text"
                                            placeholder="Nome do item..."
                                            className="w-full px-4 py-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm"
                                            value={companyFormData.cronograma_revisao.item_revisado}
                                            onChange={e => setCompanyFormData({ ...companyFormData, cronograma_revisao: { ...companyFormData.cronograma_revisao, item_revisado: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-1.5 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Resp. Revisão</label>
                                        <input
                                            type="text"
                                            placeholder="Nome do responsável..."
                                            className="w-full px-4 py-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm"
                                            value={companyFormData.cronograma_revisao.responsavel}
                                            onChange={e => setCompanyFormData({ ...companyFormData, cronograma_revisao: { ...companyFormData.cronograma_revisao, responsavel: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-1.5 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Cargo Resp.</label>
                                        <input
                                            type="text"
                                            placeholder="Cargo do responsável..."
                                            className="w-full px-4 py-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm"
                                            value={companyFormData.cronograma_revisao.cargo}
                                            onChange={e => setCompanyFormData({ ...companyFormData, cronograma_revisao: { ...companyFormData.cronograma_revisao, cargo: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-1.5 px-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Motivo Revisão</label>
                                        <input
                                            type="text"
                                            placeholder="Motivo da revisão..."
                                            className="w-full px-4 py-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm"
                                            value={companyFormData.cronograma_revisao.motivo}
                                            onChange={e => setCompanyFormData({ ...companyFormData, cronograma_revisao: { ...companyFormData.cronograma_revisao, motivo: e.target.value } })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Activities List Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity size={16} className="text-gray-400" />
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Atividades do Cronograma</label>
                                </div>

                                <div className="space-y-3">
                                    {companyFormData.cronograma_atividades.map((atividade, index) => (
                                        <div key={atividade.id} className={`p-4 rounded-2xl border transition-all ${atividade.selected ? 'bg-indigo-50/30 border-indigo-100 shadow-sm' : 'bg-white border-gray-100 opacity-60'}`}>
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${atividade.selected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300'}`}
                                                    onClick={() => {
                                                        const newAtiv = [...companyFormData.cronograma_atividades];
                                                        newAtiv[index].selected = !newAtiv[index].selected;
                                                        setCompanyFormData({ ...companyFormData, cronograma_atividades: newAtiv });
                                                    }}
                                                >
                                                    {atividade.selected && <Plus size={14} className="rotate-45" style={{ strokeWidth: 3 }} />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-bold ${atividade.selected ? 'text-indigo-900' : 'text-gray-500'}`}>{atividade.label}</p>
                                                    {atividade.selected && (
                                                        <input
                                                            type="text"
                                                            placeholder="Mês/Período (Ex: Maio/24)"
                                                            className="w-full mt-2 px-4 py-2 bg-white rounded-xl border border-indigo-100 focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-xs"
                                                            value={atividade.periodo}
                                                            onChange={e => {
                                                                const newAtiv = [...companyFormData.cronograma_atividades];
                                                                newAtiv[index].periodo = e.target.value;
                                                                setCompanyFormData({ ...companyFormData, cronograma_atividades: newAtiv });
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-white border-t border-gray-100 flex justify-between shrink-0">
                            <Button variant="ghost" className="text-ios-blue" onClick={() => {
                                setShowScheduleModal(false);
                                setShowMedicalDataModal(true);
                            }}>
                                Voltar
                            </Button>
                            <Button className="px-10 bg-[#4F46E5] hover:bg-[#4338CA] shadow-indigo-500/20 rounded-2xl" onClick={() => {
                                console.log("PCMSO DATA READY:", companyFormData);
                                alert("PCMSO Gerado com sucesso!");
                                setShowScheduleModal(false);
                            }}>
                                Gerar PCMSO
                            </Button>
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
