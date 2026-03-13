import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Treinamento, MONTHS, Aluno, Procedimento } from '../types';
import { Card, Badge, Button, Input, Select, GlassHeader, Toggle } from './UI';
import { Plus, Search, Calendar, User, Clock, GraduationCap, CheckCircle, DollarSign, Laptop, FileText, Loader2, Download, AlertTriangle, Wallet, CheckCircle2, Building, Activity, FileStack, ArrowRight } from 'lucide-react';
import { DocSeg } from '../types';

export const TrainingList: React.FC = () => {
    const [trainings, setTrainings] = useState<Treinamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [selectedTraining, setSelectedTraining] = useState<Treinamento | null>(null);
    const [specialDocs, setSpecialDocs] = useState<DocSeg[]>([]);
    const [selectedSpecialGroup, setSelectedSpecialGroup] = useState<{ empresaId: number; nome_unidade: string; docs: DocSeg[] } | null>(null);
    const [selectedRegularGroup, setSelectedRegularGroup] = useState<{ treinamento: string; empresa: string; docs: Treinamento[] } | null>(null);

    // Certificate State
    const [generatingCert, setGeneratingCert] = useState(false);

    // Form Data
    const [alunos, setAlunos] = useState<Aluno[]>([]);
    const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
    const [formData, setFormData] = useState({
        aluno: '',
        treinamento: '',
        data_realizacao: new Date().toISOString().split('T')[0],
        horario: '08:00',
        modelo: 'Presencial',
        valor: 0,
        participou: false
    });

    // Edit Data
    const [editData, setEditData] = useState<Partial<Treinamento> & {
        empresaResp?: string;
        isParcelado?: boolean;
        qntParcelas?: number;
    }>({});

    const fetchData = async () => {
        setLoading(true);
        try {
            // Updated query to fetch company name (unidades) via aluno relation for the certificate AND empresaid for finance
            const { data, error } = await supabase
                .from('treinamentos')
                .select(`
                  *,
                  aluno_rel:aluno (
                    id, 
                    nome, 
                    cpf, 
                    unidades:empresa (nome_unidade, empresaid)
                  ),
                  procedimento:treinamento (id, nome, idcategoria)
                `)
                .order('data_realizacao', { ascending: false });

            if (error) throw error;
            if (data) setTrainings(data as unknown as Treinamento[]);

            const { data: specialData, error: specialError } = await supabase
                .from('doc_seg')
                .select(`
                    *,
                    unidades:empresa (id, nome_unidade),
                    procedimento:doc (id, nome, idcategoria)
                `)
                .gte('doc', 412)
                .lte('doc', 446);

            if (specialError) throw specialError;
            if (specialData) setSpecialDocs(specialData as unknown as DocSeg[]);

            const { data: alData } = await supabase.from('aluno').select('id, nome, cpf');
            const { data: procData } = await supabase.from('procedimento').select('id, nome, idcategoria');
            if (alData) setAlunos(alData);
            if (procData) setProcedimentos(procData);

        } catch (err) {
            console.error('Error fetching trainings:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedTraining) {
            setEditData({
                data_realizacao: selectedTraining.data_realizacao,
                horario: selectedTraining.horario,
                modelo: selectedTraining.modelo,
                valor: selectedTraining.valor,
                participou: selectedTraining.participou,
                certificado_enviado: selectedTraining.certificado_enviado,
                url_certificado: selectedTraining.url_certificado,
                faturado: selectedTraining.faturado || false,
                // Defaults for billing
                empresaResp: 'Gama Medicina',
                isParcelado: false,
                qntParcelas: 1
            });
        }
    }, [selectedTraining]);

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
        if (n.includes('nr05') || n.includes('nr 05') || n.includes('cipa')) return 'nr05';
        if (n.includes('nr06') || n.includes('nr 06') || n.includes('nr-06') || n.includes('epi')) return 'nr06';
        if (n.includes('nr10') || n.includes('nr 10') || n.includes('eletricidade')) return 'nr10';
        if (n.includes('nr11') || n.includes('nr 11') || n.includes('empilhadeira') || n.includes('transporte')) return 'nr11';
        if (n.includes('nr12') || n.includes('nr 12') || n.includes('maquinas')) return 'nr12';
        if (n.includes('nr17') || n.includes('nr 17') || n.includes('ergonomia')) return 'nr17';
        if (n.includes('nr18') || n.includes('nr 18') || n.includes('construcao')) return 'nr18';
        if (n.includes('nr20') || n.includes('nr 20') || n.includes('inflamaveis')) return 'nr20';
        if (n.includes('nr23') || n.includes('nr 23') || n.includes('incendio')) return 'nr23';
        if (n.includes('nr26') || n.includes('nr 26') || n.includes('sinalizacao')) return 'nr26';
        // Retorna a tag 'nr32' se o nome mencionar 'nr32' ou área hospitalar
        if (n.includes('nr32') || n.includes('nr 32') || n.includes('hospitalar') || n.includes('saude')) return 'nr32';
        // Retorna a tag 'nr33' se o nome mencionar 'nr33' ou trabalho em altura/confinado
        if (n.includes('nr33') || n.includes('nr 33') || n.includes('confinado')) return 'nr33';
        // Retorna a tag 'nr34' se o nome mencionar 'nr34' ou área naval
        if (n.includes('nr34') || n.includes('nr 34') || n.includes('naval')) return 'nr34';
        // Retorna a tag 'nr35' se o nome mencionar 'nr35' ou trabalho em altura
        if (n.includes('nr35') || n.includes('nr 35') || n.includes('altura')) return 'nr35';

        return ''; // Unknown tag - will be filtered out
    };

    // Helper to format CPF (12345678900 -> 123.456.789-00)
    const formatCPF = (cpf: string) => {
        const numbers = cpf.replace(/\D/g, '');
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    };

    const handleGenerateCertificate = async () => {
        if (!selectedTraining || !selectedTraining.aluno_rel || !selectedTraining.procedimento) return;

        let tag = detectTrainingTag(selectedTraining.procedimento.nome);

        // Fallback: If tag detection failed but it is ID 416, force NR 05
        if (!tag && selectedTraining.procedimento.id === 416) {
            tag = 'nr05';
        }
        // Fallback: If tag detection failed but it is ID 417, force NR 06
        if (!tag && selectedTraining.procedimento.id === 417) {
            tag = 'nr06';
        }
        // Fallback: If tag detection failed but it is ID 428, force NR 17
        if (!tag && selectedTraining.procedimento.id === 428) {
            tag = 'nr17';
        }
        // Fallback: If tag detection failed but it is ID 445, force NR 34
        if (!tag && selectedTraining.procedimento.id === 445) {
            tag = 'nr34';
        }

        if (!tag) {
            alert("Não foi possível identificar a TAG deste treinamento (NR ou Curso). Verifique o nome do procedimento.");
            return;
        }

        setGeneratingCert(true);

        try {
            // 1. Prepare Date (Convert to YYYY-MM-DD string)
            const dateInput = editData.data_realizacao || selectedTraining.data_realizacao;
            const formattedDate = dateInput ? new Date(dateInput).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

            // 2. Prepare CPF
            const formattedCpf = formatCPF(selectedTraining.aluno_rel.cpf || '');

            // 3. Robust Company Name Extraction
            // Supabase might return an object or an array depending on the relationship config
            let companyName = "GAMA CENTER";
            const unidadesRel = (selectedTraining.aluno_rel as any).unidades;

            if (unidadesRel) {
                if (Array.isArray(unidadesRel) && unidadesRel.length > 0) {
                    companyName = unidadesRel[0].nome_unidade || "GAMA CENTER";
                } else if (typeof unidadesRel === 'object') {
                    companyName = unidadesRel.nome_unidade || "GAMA CENTER";
                }
            }

            const payload = {
                empresa: companyName,
                nomeCompleto: selectedTraining.aluno_rel.nome,
                cpf: formattedCpf,
                treinamento: tag,
                data: formattedDate,
                valor: Number(editData.valor || 0)
            };

            const response = await fetch("https://certificado-api.vercel.app/certificados", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                referrerPolicy: "no-referrer",
                credentials: 'omit',
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => "Unknown API Error");
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const url = data.url || data.certificateUrl || (typeof data === 'string' ? data : null);

            if (!url) throw new Error("API não retornou uma URL válida.");

            // Save URL to Supabase
            const { error } = await supabase
                .from('treinamentos')
                .update({ url_certificado: url })
                .eq('id', selectedTraining.id);

            if (error) throw error;

            // Update local state
            setEditData(prev => ({ ...prev, url_certificado: url }));
            setSelectedTraining(prev => prev ? ({ ...prev, url_certificado: url }) : null);

            fetchData();

            alert("Certificado gerado com sucesso!");

        } catch (error: any) {
            let msg = error.message;
            if (msg === "Failed to fetch") {
                msg = "Falha na conexão. Verifique se o servidor da API está online e aceita requisições (Erro de CORS/Rede).";
            }
            alert("Erro ao gerar certificado: " + msg);
        } finally {
            setGeneratingCert(false);
        }
    };

    const handleCreate = async () => {
        try {
            if (!formData.aluno || !formData.treinamento) return alert("Preencha aluno e treinamento");

            const { error } = await supabase.from('treinamentos').insert({
                aluno: parseInt(formData.aluno),
                treinamento: parseInt(formData.treinamento),
                data_realizacao: formData.data_realizacao,
                horario: formData.horario,
                modelo: formData.modelo,
                valor: formData.valor,
                participou: formData.participou,
                certificado_enviado: false,
                faturado: false
            });

            if (error) throw error;
            setShowModal(false);
            fetchData();
        } catch (error: any) {
            alert("Erro ao agendar treinamento: " + error.message);
        }
    };

    const handleUpdate = async () => {
        if (!selectedTraining) return;
        try {
            // 1. Financeiro & Metas Logic
            if (editData.faturado && !selectedTraining.faturado) {
                // Extract empresaid from the nested relation in aluno
                let contratanteId = null;
                const unidadesRel = (selectedTraining.aluno_rel as any)?.unidades;

                if (unidadesRel) {
                    if (Array.isArray(unidadesRel) && unidadesRel.length > 0) {
                        contratanteId = unidadesRel[0].empresaid;
                    } else if (typeof unidadesRel === 'object') {
                        contratanteId = unidadesRel.empresaid;
                    }
                }

                // Insert into financeiro_receitas
                const payloadFinanceiro = {
                    data_projetada: editData.data_realizacao || new Date().toISOString().split('T')[0],
                    valor_doc: editData.valor,
                    valor_total: editData.valor,
                    status: 'Aguardando',
                    empresa_resp: editData.empresaResp,
                    parcela: editData.isParcelado,
                    qnt_parcela: editData.isParcelado ? editData.qntParcelas : 1,
                    parcela_paga: 0,
                    contratante: contratanteId,
                    descricao: `Treinamento: ${selectedTraining.procedimento?.nome} - ${selectedTraining.aluno_rel?.nome}`,
                    valor_outros: 0
                };

                const { error: finError } = await supabase.from('financeiro_receitas').insert(payloadFinanceiro);
                if (finError) throw new Error("Erro ao gerar financeiro: " + finError.message);

                // --- LOGICA GERENCIA_META (ID 5) ---
                const gerenciaId = 5;
                const valorToAdd = editData.valor || 0;
                const now = new Date();
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
                    console.error("Erro ao buscar meta:", metaFetchError);
                }

                if (existingMeta) {
                    // Existe: Soma ao valor atual
                    const newFaturamento = (existingMeta.faturamento || 0) + valorToAdd;
                    const { error: updateMetaError } = await supabase
                        .from('gerencia_meta')
                        .update({ faturamento: newFaturamento })
                        .eq('id', existingMeta.id);

                    if (updateMetaError) console.error("Erro ao atualizar meta:", updateMetaError);
                    else console.log("Meta de treinamento (ID 5) atualizada com sucesso (+R$", valorToAdd, ")");
                } else {
                    // Não existe: Cria nova linha
                    const { error: insertMetaError } = await supabase
                        .from('gerencia_meta')
                        .insert({
                            gerencia: gerenciaId,
                            faturamento: valorToAdd
                        });

                    if (insertMetaError) console.error("Erro ao criar meta:", insertMetaError);
                    else console.log("Nova meta de treinamento criada para o mês (R$", valorToAdd, ")");
                }

                alert("Financeiro e Metas processados com sucesso!");
            }

            const { error } = await supabase.from('treinamentos').update({
                data_realizacao: editData.data_realizacao,
                horario: editData.horario,
                modelo: editData.modelo,
                valor: editData.valor,
                participou: editData.participou,
                certificado_enviado: editData.certificado_enviado,
                url_certificado: editData.url_certificado,
                faturado: editData.faturado
            }).eq('id', selectedTraining.id);

            if (error) throw error;
            setSelectedTraining(null);
            fetchData();
        } catch (err: any) {
            alert("Erro ao atualizar: " + err.message);
        }
    };

    const groupedTrainings = useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        
        // Process regular trainings
        trainings.forEach(t => {
            const date = new Date(t.data_realizacao);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const groupKey = `${year}-${month}`;
            
            if (!groups[groupKey]) groups[groupKey] = [];
            
            // Agrupar por empresa e nome do treinamento para verificar multiplicidade
            const empresaNome = (t.aluno_rel as any)?.unidades?.nome_unidade || 'Empresa desconhecida';
            const treinamentoNome = t.procedimento?.nome || 'Treinamento Geral';
            const matchKey = `${empresaNome}-${treinamentoNome}`;
            
            const existingGroup = groups[groupKey].find(g => 
                g.isRegularGroup && 
                g.matchKey === matchKey
            );

            if (existingGroup) {
                existingGroup.docs.push(t);
                existingGroup.count = existingGroup.docs.length;
            } else {
                groups[groupKey].push({
                    isRegularGroup: true,
                    matchKey: matchKey,
                    empresa: empresaNome,
                    treinamento: treinamentoNome,
                    count: 1,
                    docs: [t],
                    // Dados do primeiro para exibição individual se for apenas 1
                    data_realizacao: t.data_realizacao,
                    horario: t.horario,
                    modelo: t.modelo,
                    faturado: t.faturado,
                    aluno_nome: t.aluno_rel?.nome,
                    aluno_unidade: empresaNome,
                    certificado_enviado: t.certificado_enviado,
                    url_certificado: t.url_certificado,
                    id: t.id,
                    participou: t.participou
                });
            }
        });

        // Track special groups from doc_seg (IDs 412-446)
        specialDocs.forEach(doc => {
            const year = new Date(doc.created_at).getFullYear();
            const month = doc.mes;
            const groupKey = `${year}-${month}`;
            
            if (!groups[groupKey]) groups[groupKey] = [];
            
            const empresaId = doc.empresa;
            const existingSpecial = groups[groupKey].find(g => g.isSpecialGroup && g.empresaId === empresaId);

            if (existingSpecial) {
                existingSpecial.docs.push(doc);
                existingSpecial.count = existingSpecial.docs.length;
            } else {
                groups[groupKey].push({
                    isSpecialGroup: true,
                    empresaId: doc.empresa,
                    nome_unidade: doc.unidades?.nome_unidade || 'Empresa desconhecida',
                    count: 1,
                    docs: [doc]
                });
            }
        });

        return groups;
    }, [trainings, specialDocs]);

    const filteredGroupKeys = Object.keys(groupedTrainings)
        .sort((a, b) => {
            const [yearA, monthA] = a.split('-').map(Number);
            const [yearB, monthB] = b.split('-').map(Number);
            if (yearA !== yearB) return yearB - yearA;
            return monthB - monthA;
        });

    // Filter procedures for dropdown (idcategoria 46) AND supported tags OR specific ID 417, 428, 445 OR name includes NR10/NR32
    const filteredProcedimentos = procedimentos.filter(p => {
        if (p.id === 416) return true; // Explicitly allow NR 05 (ID 416)
        if (p.id === 417) return true; // Explicitly allow NR 06 (ID 417)
        if (p.id === 428) return true; // Explicitly allow NR 17 (ID 428)
        if (p.id === 445) return true; // Explicitly allow NR 34 (ID 445)

        // Verifica explicitamente os nomes das NRs, independentemente da categoria associada
        const lowerName = p.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // Retorna verdadeiro se o nome for de NR 05
        if (lowerName.includes('nr05') || lowerName.includes('nr 05')) return true;
        // Retorna verdadeiro se o nome for de NR 10
        if (lowerName.includes('nr10') || lowerName.includes('nr 10')) return true;
        // Retorna verdadeiro se o nome for de NR 32
        if (lowerName.includes('nr32') || lowerName.includes('nr 32')) return true;
        // Retorna verdadeiro se o nome for de NR 33
        if (lowerName.includes('nr33') || lowerName.includes('nr 33')) return true;

        // Verifica se a categoria não é 46, rejeitando o procedimento
        if (p.idcategoria !== 46) return false;
        // Captura a tag baseada no nome usando a função auxiliar
        const tag = detectTrainingTag(p.nome);
        // Retorna válido caso uma tag tenha sido encontrada
        return tag !== ''; // Only allow if mapped to a known tag
    });

    return (
        <div className="pb-10">
            <GlassHeader
                title="Gestão de Treinamentos"
                actions={
                    <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
                        <Plus size={18} strokeWidth={2.5} />
                        <span>Novo Treinamento</span>
                    </Button>
                }
            />

            <div className="px-8">
                <div className="relative mb-8 max-w-md">
                    <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar aluno ou treinamento..."
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
                        {filteredGroupKeys.map(key => {
                            const [year, month] = key.split('-').map(Number);
                            const itemsInMonth = (groupedTrainings[key] as any[]).filter(item => {
                                if (item.isSpecialGroup) {
                                    return item.nome_unidade.toLowerCase().includes(searchTerm.toLowerCase());
                                }
                                if (item.isRegularGroup) {
                                    const matchEmpresa = item.empresa.toLowerCase().includes(searchTerm.toLowerCase());
                                    const matchTreino = item.treinamento.toLowerCase().includes(searchTerm.toLowerCase());
                                    const matchAlunos = item.docs.some((d: any) => (d.aluno_rel?.nome || '').toLowerCase().includes(searchTerm.toLowerCase()));
                                    return matchEmpresa || matchTreino || matchAlunos;
                                }
                                return false;
                            });

                            if (itemsInMonth.length === 0) return null;

                            return (
                                <div key={key} className="animate-fade-in-up">
                                    <div className="flex items-center gap-3 mb-6 ml-2">
                                        <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
                                        <h2 className="text-xl font-bold text-gray-800">
                                            {MONTHS[month - 1]} <span className="text-gray-400 font-medium ml-1">{year}</span>
                                        </h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {itemsInMonth.map((item, idx) => {
                                            if (item.isSpecialGroup) {
                                                return (
                                                    <div key={`special-${item.empresaId}-${key}-${idx}`} onClick={() => setSelectedSpecialGroup(item)} className="cursor-pointer group">
                                                        <Card className="hover:-translate-y-1 hover:shadow-ios-float transition-all duration-300 relative overflow-hidden h-full flex flex-col ring-1 ring-purple-100 bg-purple-50/20">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                                                                    <FileStack size={20} strokeWidth={2.5} />
                                                                </div>
                                                                <div className="bg-purple-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                                    {item.count} Documentos
                                                                </div>
                                                            </div>
                                                            <h3 className="font-bold text-[17px] text-gray-900 leading-snug mb-1 truncate" title={item.nome_unidade}>
                                                                {item.nome_unidade}
                                                            </h3>
                                                            <div className="text-sm text-purple-600 font-bold mb-auto flex items-center gap-1.5">
                                                                <Activity size={14} /> Treinamentos de Normas
                                                            </div>
                                                            <div className="pt-4 mt-4 border-t border-purple-100/50 flex justify-end">
                                                                <span className="text-[10px] font-bold text-purple-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                                                                    VER TODOS <ArrowRight size={10} />
                                                                </span>
                                                            </div>
                                                        </Card>
                                                    </div>
                                                );
                                            }

                                            if (item.isRegularGroup) {
                                                // Estilo híbrido: se for apenas 1, mostra individual. Se for >1, mostra agrupado.
                                                if (item.count === 1) {
                                                    const t = item.docs[0];
                                                    return (
                                                        <div key={`individual-${t.id}`} onClick={() => setSelectedTraining(t)} className="cursor-pointer group">
                                                            <Card className="hover:-translate-y-1 hover:shadow-ios-float transition-all duration-300 relative overflow-hidden h-full flex flex-col">
                                                                {t.certificado_enviado && (
                                                                    <div className="absolute top-0 right-0 p-2.5 bg-purple-500/10 rounded-bl-2xl">
                                                                        <CheckCircle size={16} className="text-purple-600" />
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                                                                        <GraduationCap size={20} />
                                                                    </div>
                                                                    <Badge status={t.participou ? 'Presente' : 'Ausente'} />
                                                                </div>
                                                                <h3 className="font-bold text-[17px] text-gray-900 leading-snug mb-1">
                                                                    {t.procedimento?.nome || 'Treinamento Geral'}
                                                                </h3>
                                                                <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium mb-auto">
                                                                    <User size={14} className="text-gray-400" />
                                                                    <span className="truncate">{t.aluno_rel?.nome || 'Aluno S/N'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium mt-1">
                                                                    <Building size={14} className="text-gray-400" />
                                                                    <span className="truncate">{item.empresa}</span>
                                                                </div>

                                                                <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center text-xs font-medium">
                                                                    <div className="flex items-center gap-1.5 text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                                                                        <Calendar size={12} />
                                                                        {new Date(t.data_realizacao).toLocaleDateString()}
                                                                    </div>
                                                                    <div className="text-gray-900 font-semibold flex items-center gap-1">
                                                                        <Clock size={12} className="text-gray-400" />
                                                                        {t.horario.substring(0, 5)}
                                                                    </div>
                                                                    {t.faturado && (
                                                                        <div title="Faturado" className="bg-green-100 text-green-700 p-1 rounded-md">
                                                                            <DollarSign size={10} />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {t.url_certificado && (
                                                                    <div className="mt-3 flex items-center justify-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 py-1 rounded-md">
                                                                        <FileText size={10} /> CERTIFICADO GERADO
                                                                    </div>
                                                                )}
                                                            </Card>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={`regular-${item.empresa}-${item.treinamento}-${idx}`} onClick={() => setSelectedRegularGroup(item)} className="cursor-pointer group">
                                                        <Card className="hover:-translate-y-1 hover:shadow-ios-float transition-all duration-300 relative overflow-hidden h-full flex flex-col ring-1 ring-ios-blue/10 bg-ios-blue/5">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="w-10 h-10 rounded-2xl bg-ios-blue/10 flex items-center justify-center text-ios-blue group-hover:bg-ios-blue group-hover:text-white transition-colors duration-300">
                                                                    <GraduationCap size={20} />
                                                                </div>
                                                                <div className="bg-ios-blue text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                                    x{item.count} Alunos
                                                                </div>
                                                            </div>
                                                            <h3 className="font-bold text-[17px] text-gray-900 leading-snug mb-1">
                                                                {item.treinamento}
                                                            </h3>
                                                            <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium mb-auto">
                                                                <Building size={14} className="text-gray-400" />
                                                                <span className="truncate">{item.empresa}</span>
                                                            </div>

                                                            <div className="pt-4 mt-4 border-t border-ios-blue/10 flex justify-between items-center text-xs font-medium">
                                                                <div className="flex items-center gap-1.5 text-gray-500 bg-white/50 px-2 py-1 rounded-lg">
                                                                    <Calendar size={12} />
                                                                    {new Date(item.data_realizacao).toLocaleDateString()}
                                                                </div>
                                                                <div className="text-gray-900 font-semibold flex items-center gap-1">
                                                                    <Clock size={12} className="text-gray-400" />
                                                                    {item.horario.substring(0, 5)}
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 text-center">
                                                                <span className="inline-block px-2.5 py-1 bg-ios-blue text-white rounded-md text-[10px] uppercase font-bold tracking-wider group-hover:bg-ios-blue-dark">
                                                                    Ver {item.count} Alunos
                                                                </span>
                                                            </div>
                                                        </Card>
                                                    </div>
                                                );
                                            }

                                            return null;
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-xl overflow-hidden animate-scale-in p-0 shadow-2xl">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-xl">
                            <h2 className="text-xl font-bold text-gray-900">Novo Treinamento</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">O que e Quem</h3>
                                <Select
                                    label="Aluno"
                                    icon={<User size={18} />}
                                    value={formData.aluno}
                                    onChange={e => setFormData({ ...formData, aluno: e.target.value })}
                                >
                                    <option value="">Selecione o aluno</option>
                                    {alunos.map(a => <option key={a.id} value={a.id}>{a.nome} ({a.cpf})</option>)}
                                </Select>

                                <Select
                                    label="Treinamento"
                                    icon={<GraduationCap size={18} />}
                                    value={formData.treinamento}
                                    onChange={e => setFormData({ ...formData, treinamento: e.target.value })}
                                >
                                    <option value="">Selecione o curso</option>
                                    {filteredProcedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                </Select>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Detalhes</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Data"
                                        type="date"
                                        className="bg-white"
                                        value={formData.data_realizacao}
                                        onChange={e => setFormData({ ...formData, data_realizacao: e.target.value })}
                                    />
                                    <Input
                                        label="Horário"
                                        type="time"
                                        className="bg-white"
                                        icon={<Clock size={18} />}
                                        value={formData.horario}
                                        onChange={e => setFormData({ ...formData, horario: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Select
                                        label="Modelo"
                                        className="bg-white"
                                        icon={<Laptop size={18} />}
                                        value={formData.modelo}
                                        onChange={e => setFormData({ ...formData, modelo: e.target.value })}
                                    >
                                        <option value="Presencial">Presencial</option>
                                        <option value="EAD">EAD</option>
                                        <option value="Hibrido">Híbrido</option>
                                    </Select>
                                    <Input
                                        label="Valor (R$)"
                                        type="number"
                                        step="0.01"
                                        className="bg-white"
                                        icon={<DollarSign size={16} />}
                                        value={formData.valor}
                                        onChange={e => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
                                    />
                                </div>

                                <div className="pt-2 border-t border-gray-200/50">
                                    <Toggle
                                        label="Presença Confirmada"
                                        description="O aluno esteve presente no treinamento?"
                                        checked={formData.participou}
                                        onChange={(val) => setFormData({ ...formData, participou: val })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex gap-3 bg-gray-50/50">
                            <Button variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                            <Button className="flex-1 bg-purple-600 hover:bg-purple-700 shadow-purple-500/30" onClick={handleCreate}>Agendar</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Edit Modal */}
            {selectedTraining && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-lg overflow-hidden animate-scale-in p-0 shadow-2xl">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-purple-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 leading-tight">{selectedTraining.procedimento?.nome}</h2>
                                <p className="text-purple-600 text-sm mt-1 flex items-center gap-1.5 font-medium">
                                    <User size={12} /> {selectedTraining.aluno_rel?.nome}
                                </p>
                            </div>
                            <button onClick={() => setSelectedTraining(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Certificate Section */}
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-2xl border border-indigo-100 shadow-sm">
                                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                                    <FileText size={12} /> Certificação
                                </h3>

                                {editData.url_certificado ? (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-indigo-100">
                                            <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                                                <CheckCircle size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-900">Certificado Emitido</p>
                                                <p className="text-xs text-gray-500">Disponível para download</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <a
                                                href={editData.url_certificado}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold text-center hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Download size={16} /> Baixar PDF
                                            </a>
                                            <button
                                                onClick={handleGenerateCertificate}
                                                disabled={generatingCert}
                                                className="px-4 py-2.5 bg-white border border-indigo-200 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-colors"
                                            >
                                                {generatingCert ? <Loader2 size={16} className="animate-spin" /> : 'Regerar'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="text-sm text-gray-600 leading-snug">
                                            Gere o certificado oficial após a conclusão do curso.
                                        </div>
                                        <button
                                            onClick={handleGenerateCertificate}
                                            disabled={generatingCert || !editData.participou}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 whitespace-nowrap transition-all ${editData.participou
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                            {generatingCert ? (
                                                <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                                            ) : (
                                                <><FileText size={16} /> Gerar Certificado</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Data"
                                    type="date"
                                    value={editData.data_realizacao ? new Date(editData.data_realizacao).toISOString().split('T')[0] : ''}
                                    onChange={e => setEditData({ ...editData, data_realizacao: e.target.value })}
                                />
                                <Input
                                    label="Horário"
                                    type="time"
                                    icon={<Clock size={18} />}
                                    value={editData.horario || ''}
                                    onChange={e => setEditData({ ...editData, horario: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Modelo"
                                    icon={<Laptop size={18} />}
                                    value={editData.modelo || ''}
                                    onChange={e => setEditData({ ...editData, modelo: e.target.value })}
                                >
                                    <option value="Presencial">Presencial</option>
                                    <option value="EAD">EAD</option>
                                    <option value="Hibrido">Híbrido</option>
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

                            {/* Billing Section */}
                            <div className={`p-5 rounded-2xl border transition-all duration-300 ${editData.faturado ? 'bg-blue-50/50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${editData.faturado ? 'text-ios-blue' : 'text-gray-400'}`}>
                                        <Wallet size={12} /> Faturamento
                                    </h3>
                                    <Toggle
                                        label={editData.faturado ? "Faturado" : "Gerar Faturamento"}
                                        checked={editData.faturado || false}
                                        onChange={(val) => {
                                            if (selectedTraining.faturado && !val) {
                                                alert("Não é possível cancelar o faturamento por aqui. Contate o suporte.");
                                                return;
                                            }
                                            setEditData({ ...editData, faturado: val })
                                        }}
                                    />
                                </div>

                                {editData.faturado && !selectedTraining.faturado && (
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
                                {selectedTraining.faturado && (
                                    <div className="text-xs text-green-600 font-medium flex items-center gap-2 bg-green-50 p-2 rounded-lg">
                                        <CheckCircle2 size={12} /> Financeiro já gerado para este treinamento.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <Toggle
                                    label="Presença Confirmada"
                                    description="O aluno esteve presente no treinamento?"
                                    checked={editData.participou || false}
                                    onChange={(val) => setEditData({ ...editData, participou: val })}
                                />

                                <Toggle
                                    label="Certificado Enviado"
                                    description="Marque após enviar o certificado ao aluno."
                                    checked={editData.certificado_enviado || false}
                                    onChange={(val) => setEditData({ ...editData, certificado_enviado: val })}
                                />
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex gap-3">
                            <Button variant="ghost" className="flex-1" onClick={() => setSelectedTraining(null)}>Cancelar</Button>
                            <Button className="flex-1 bg-purple-600 hover:bg-purple-700 shadow-purple-500/30" onClick={handleUpdate}>Atualizar</Button>
                        </div>
                    </Card>
                </div>
            )}
            {/* Special Group Modal */}
            {selectedSpecialGroup && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-2xl overflow-hidden animate-scale-in p-0 shadow-2xl">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-purple-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 leading-tight">Documentos de Treinamento</h2>
                                <p className="text-purple-600 text-sm mt-1 font-semibold flex items-center gap-1.5">
                                    <Building size={14} /> {selectedSpecialGroup.nome_unidade}
                                </p>
                            </div>
                            <button onClick={() => setSelectedSpecialGroup(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                                <span className="text-2xl leading-none">&times;</span>
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                            {selectedSpecialGroup.docs.map(doc => (
                                <div key={doc.id} className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                                <GraduationCap size={16} className="text-purple-500" />
                                                {doc.procedimento?.nome}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Referência: {doc.mes}/{new Date(doc.created_at).getFullYear()}
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
                                        {doc.faturado && (
                                            <div className="flex items-center gap-1 ml-auto bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                                <DollarSign size={10} /> FATURADO
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <Button variant="secondary" onClick={() => setSelectedSpecialGroup(null)}>Fechar</Button>
                        </div>
                    </Card>
                </div>
            )}
            {/* Regular Group Modal */}
            {selectedRegularGroup && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <Card className="w-full max-w-2xl overflow-hidden animate-scale-in p-0 shadow-2xl">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-blue-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedRegularGroup.treinamento}</h2>
                                <p className="text-ios-blue text-sm mt-1 font-semibold flex items-center gap-1.5">
                                    <Building size={14} /> {selectedRegularGroup.empresa}
                                </p>
                            </div>
                            <button onClick={() => setSelectedRegularGroup(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                                <span className="text-2xl leading-none">&times;</span>
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                            {selectedRegularGroup.docs.map(t => (
                                <div key={t.id} className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow bg-white flex justify-between items-center group/item hover:border-ios-blue/30" onClick={() => {
                                    setSelectedRegularGroup(null);
                                    setSelectedTraining(t);
                                }}>
                                    <div>
                                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                            <User size={16} className="text-ios-blue" />
                                            {t.aluno_rel?.nome}
                                        </h4>
                                        <p className="text-[10px] text-gray-400 mt-0.5 uppercase font-bold tracking-tighter">
                                            CPF: {t.aluno_rel?.cpf} • {t.modelo}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge status={t.participou ? 'Presente' : 'Ausente'} />
                                        <ArrowRight size={16} className="text-gray-300 group-hover/item:text-ios-blue transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <Button variant="secondary" onClick={() => setSelectedRegularGroup(null)}>Fechar</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
