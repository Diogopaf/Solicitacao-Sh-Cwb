import React, { useState } from 'react';
import { CheckCircle2, Church, CalendarClock, MapPin, ArrowLeft, MessageCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import logoComunidade from '../assets/logo.jpg';

interface FormProps {
  onVoltar: () => void;
}

export default function SolicitacaoLiturgiaForm({ onVoltar }: FormProps) {
  const { user } = useAuth(); 
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    ministerio: '',
    contatos: '',
    servicoTipo: '', 
    servicoExato: '',
    datas: '',
    horarios: '',
    local: '', 
    endereco: '',
    esportulaPrevista: '', 
    quemPagamento: '',
    tituloIcone: '',
    corTecido: '',
    outrasNecessidades: '',
    termoCiencia: false,
  });

  const [submitted, setSubmitted] = useState(false);

  const calcularDataMinima = () => {
    const data = new Date();
    
    if (formData.servicoTipo === 'Padre') {
      data.setMonth(data.getMonth() + 2);
    } else if (formData.servicoTipo === 'MESC') {
      // Regra dinâmica: Visita aos doentes (permite dia seguinte) vs Outros (45 dias)
      if (formData.servicoExato === 'Visita aos doentes') {
        data.setDate(data.getDate() + 1);
      } else {
        data.setDate(data.getDate() + 45);
      }
    } else if (formData.servicoTipo === 'Material Litúrgico') {
      data.setDate(data.getDate() + 14);
    }
    
    return data.toISOString().split('T')[0]; 
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'servicoTipo') {
      const servicoExatoAuto = value === 'Material Litúrgico' ? 'Empréstimo de Material' : '';
      setFormData(prev => ({ ...prev, servicoTipo: value, datas: '', servicoExato: servicoExatoAuto }));
      return;
    }

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert("Você precisa estar logado para enviar uma solicitação.");
      return;
    }

    const dataMinimaPermitida = calcularDataMinima();
    if (formData.datas < dataMinimaPermitida) {
      const dataFormatada = dataMinimaPermitida.split('-').reverse().join('/');
      alert(`O prazo mínimo de antecedência não foi respeitado. Selecione uma data a partir de ${dataFormatada}.`);
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "solicitacoes"), {
        ...formData, 
        userId: user.uid, 
        dataCriacao: new Date().toISOString(), 
        status: "Pendente" 
      });

      setSubmitted(true);
      
      setFormData({
        nome: '', ministerio: '', contatos: '', servicoTipo: '', servicoExato: '',
        datas: '', horarios: '', local: '', endereco: '', esportulaPrevista: '',
        quemPagamento: '', tituloIcone: '', corTecido: '', outrasNecessidades: '',
        termoCiencia: false,
      });

      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
      alert("Ocorreu um erro ao enviar sua solicitação. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] flex flex-col items-center justify-center font-sans sm:p-8 p-4 py-12">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        
        {/* Cabeçalho */}
        <div className="bg-slate-900 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative">
          <button 
            onClick={onVoltar}
            className="absolute top-6 left-6 text-slate-400 hover:text-[#EA9248] transition-colors flex items-center justify-center bg-white/5 rounded-full p-2"
            title="Voltar ao Menu Principal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 mt-10 sm:mt-0 sm:ml-12">
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center border border-[#EA9248]/30 shrink-0 shadow-sm">
              <Church className="w-8 h-8 text-[#EA9248]" />
            </div>

            <div>
              <h1 className="text-white font-bold text-xl tracking-tight uppercase">Ministério de Liturgia</h1>
              <p className="text-[#EA9248] text-xs font-medium uppercase tracking-[0.2em] mt-1">Solicitação de Agendamento</p>
            </div>
          </div>
          <div className="text-center sm:text-right w-full sm:w-auto mt-2 sm:mt-0 bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-lg">
            <span className="text-[#EA9248] text-[10px] font-bold uppercase tracking-widest block mb-1">Aviso Importante</span>
            <span className="text-white/60 text-[11px]">Prazos Mínimos: Padre (2 meses) • MESC (45 dias) • Material (2 semanas)</span> 
          </div>
        </div>

        {/* Conteúdo Principal do Formulário */}
        <div className="flex-1 p-6 sm:p-8 sm:pb-6">
          {submitted && (
            <div className="mb-8 bg-green-50/80 border border-green-200 p-4 rounded-xl flex items-center shadow-sm">
              <CheckCircle2 className="h-6 w-6 text-green-500 mr-3 shrink-0" />
              <div>
                <h3 className="text-green-800 font-bold text-sm tracking-wide">Solicitação enviada com sucesso!</h3>
                <p className="text-green-700 text-xs mt-0.5">Sua solicitação foi registrada no sistema.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
            
            {/* Coluna Esquerda: Informações Primárias */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5 sm:col-span-2">
                  <label htmlFor="nome" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nome do Solicitante *</label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    required
                    value={formData.nome}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#EA9248] focus:ring-1 focus:ring-[#EA9248] transition-all placeholder:text-slate-400"
                    placeholder="Nome completo"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label htmlFor="ministerio" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Ministério ou Célula *</label>
                  <input
                    type="text"
                    id="ministerio"
                    name="ministerio"
                    required
                    value={formData.ministerio}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#EA9248] focus:ring-1 focus:ring-[#EA9248] transition-all placeholder:text-slate-400"
                    placeholder="Ex: Célula Anjos"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label htmlFor="contatos" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Contatos (Telefone/Email) *</label>
                  <input
                    type="text"
                    id="contatos"
                    name="contatos"
                    required
                    value={formData.contatos}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#EA9248] focus:ring-1 focus:ring-[#EA9248] transition-all placeholder:text-slate-400"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Qual serviço necessita? *</label>
                <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                  {['Padre', 'MESC', 'Material Litúrgico'].map((tipo) => (
                    <label key={tipo} className={`cursor-pointer transition-all ${formData.servicoTipo === tipo ? 'px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-bold shadow-sm ring-1 ring-black/5 flex items-center gap-2' : 'px-4 py-2 text-slate-500 rounded-lg text-xs font-bold hover:bg-white/50 flex items-center gap-2'}`}>
                      <input
                        type="radio"
                        name="servicoTipo"
                        value={tipo}
                        required
                        checked={formData.servicoTipo === tipo}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      {formData.servicoTipo === tipo && <span className="w-2 h-2 rounded-full bg-[#EA9248]"></span>}
                      {tipo}
                    </label>
                  ))}
                </div>
                
                {formData.servicoTipo === 'Padre' && (
                  <div className="text-[11px] text-[#EA9248] font-medium pl-1 mt-1 pb-1 flex items-center">
                    <CalendarClock className="w-3.5 h-3.5 mr-1" />
                    Requer antecedência mínima de 2 meses.
                  </div>
                )}
                {formData.servicoTipo === 'MESC' && (
                  <div className="text-[11px] text-[#EA9248] font-medium pl-1 mt-1 pb-1 flex items-center">
                    <CalendarClock className="w-3.5 h-3.5 mr-1" />
                    {formData.servicoExato === 'Visita aos doentes' 
                      ? 'Para casos de saúde, permitida antecedência de 1 dia.' 
                      : 'Requer antecedência mínima de 45 dias.'}
                  </div>
                )}
                {formData.servicoTipo === 'Material Litúrgico' && (
                  <div className="text-[11px] text-blue-600 font-medium pl-1 mt-1 pb-1 flex items-center">
                    <CalendarClock className="w-3.5 h-3.5 mr-1" />
                    Requer antecedência mínima de 2 semanas.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* Select Condicional de Serviço Exato */}
                {formData.servicoTipo !== 'Material Litúrgico' && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="servicoExato" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Serviço Exato *</label>
                    <select
                      id="servicoExato"
                      name="servicoExato"
                      required
                      value={formData.servicoExato}
                      onChange={handleChange}
                      disabled={!formData.servicoTipo}
                      className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-[#EA9248] focus:ring-1 focus:ring-[#EA9248] text-slate-700"
                    >
                      <option value="" disabled>
                        {!formData.servicoTipo ? 'Selecione a categoria acima primeiro' : 'Selecione o serviço...'}
                      </option>
                      
                      {formData.servicoTipo === 'Padre' && (
                        <>
                          <option value="Celebração da Eucaristia (Missa)">Celebração da Eucaristia (Missa)</option>
                          <option value="Confissão">Confissão</option>
                          <option value="Exposição do Santíssimo">Exposição do Santíssimo</option>
                          <option value="Visita aos doentes">Visita aos doentes</option>
                          <option value="Outros">Outros</option>
                        </>
                      )}
                      
                      {formData.servicoTipo === 'MESC' && (
                        <>
                          <option value="Celebração da Palavra">Celebração da Palavra</option>
                          <option value="Exposição do Santíssimo">Exposição do Santíssimo</option>
                          <option value="Visita aos doentes">Visita aos doentes</option>
                          <option value="Outros">Outros</option>
                        </>
                      )}
                    </select>

                    {/* Bloco de Contato Direto e Rápido para Visita aos Doentes com Mensagem Pré-preenchida */}
                    {formData.servicoTipo === 'MESC' && formData.servicoExato === 'Visita aos doentes' && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col gap-2 shadow-sm animate-fadeIn">
                        <div className="flex items-center gap-2 text-green-800 font-black text-xs uppercase tracking-wider">
                          Contato Direto - Ministros
                        </div>
                        <p className="text-xs text-green-700 leading-relaxed">
                          Para agilizar o atendimento neste momento delicado, conclua o preenchimento do formulário abaixo e, se preferir, entre em contato imediatamente com nossos ministros pelo WhatsApp:
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 mt-2">
                          <a 
                            href="https://wa.me/5541996936510?text=Ol%C3%A1%2C%20vim%20solicitar%20o%20agendamento%20para%20a%20visita%20de%20uma%20pessoa%20que%20est%C3%A1%20doente." 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center justify-center gap-2 text-sm font-bold text-green-800 hover:text-white hover:bg-green-600 bg-white px-4 py-2.5 rounded-lg border border-green-300 transition-all shadow-sm"
                          >
                            <MessageCircle className="w-4 h-4" /> (41) 99693-6510
                          </a>
                          <a 
                            href="https://wa.me/5541996056811?text=Ol%C3%A1%2C%20vim%20solicitar%20o%20agendamento%20para%20a%20visita%20de%20uma%20pessoa%20que%20est%C3%A1%20doente." 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center justify-center gap-2 text-sm font-bold text-green-800 hover:text-white hover:bg-green-600 bg-white px-4 py-2.5 rounded-lg border border-green-300 transition-all shadow-sm"
                          >
                            <MessageCircle className="w-4 h-4" /> (41) 99605-6811
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="datas" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Data *</label>
                  <input
                    key={`${formData.servicoTipo}-${formData.servicoExato}`}
                    type="date"
                    id="datas"
                    name="datas"
                    required
                    min={calcularDataMinima()}
                    value={formData.datas}
                    onChange={handleChange}
                    disabled={!formData.servicoTipo}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#EA9248] focus:ring-1 focus:ring-[#EA9248] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!formData.servicoTipo ? "Selecione o tipo de serviço primeiro" : ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="horarios" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Horário(s) *</label>
                  <input
                    type="text"
                    id="horarios"
                    name="horarios"
                    required
                    value={formData.horarios}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#EA9248] focus:ring-1 focus:ring-[#EA9248] transition-all"
                    placeholder="00:00"
                  />
                </div>
              </div>

              <div className={`transition-all duration-500 ${formData.servicoTipo === 'Padre' ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                {formData.servicoTipo === 'Padre' && (
                  <div className="p-5 bg-[#EA9248]/5 rounded-2xl border border-[#EA9248]/20 border-dashed space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-6 bg-[#EA9248] rounded-full"></div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Campos Específicos: Padre</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#EA9248] uppercase tracking-wider ml-1">A espórtula está prevista em PO? *</label>
                        <div className="flex gap-2">
                          {['Sim', 'Não'].map((opt) => (
                            <label key={opt} className={`cursor-pointer flex-1 py-2.5 rounded-lg text-xs font-bold text-center transition-all ${
                              formData.esportulaPrevista === opt 
                              ? 'bg-[#EA9248] text-white shadow-md shadow-[#EA9248]/20' 
                              : 'bg-white text-slate-600 border border-[#EA9248]/30 hover:bg-[#EA9248]/10'
                            }`}>
                              <input
                                type="radio"
                                name="esportulaPrevista"
                                value={opt}
                                required
                                checked={formData.esportulaPrevista === opt}
                                onChange={handleChange}
                                className="sr-only"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#EA9248] uppercase tracking-wider ml-1">Quem realizará o pagamento? *</label>
                        <div className="flex gap-2">
                          {['Economato', 'Outro'].map((opt) => (
                            <label key={opt} className={`cursor-pointer flex-1 py-2.5 rounded-lg text-xs font-bold text-center transition-all ${
                              formData.quemPagamento === opt 
                              ? 'bg-[#EA9248] text-white shadow-md shadow-[#EA9248]/20' 
                              : 'bg-white text-slate-600 border border-[#EA9248]/30 hover:bg-[#EA9248]/10'
                            }`}>
                              <input
                                type="radio"
                                name="quemPagamento"
                                value={opt}
                                required
                                checked={formData.quemPagamento === opt}
                                onChange={handleChange}
                                className="sr-only"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={`transition-all duration-500 ${formData.servicoTipo === 'Material Litúrgico' ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                {formData.servicoTipo === 'Material Litúrgico' && (
                  <div className="p-5 bg-[#EA9248]/5 rounded-2xl border border-[#EA9248]/20 border-dashed space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-6 bg-[#EA9248] rounded-full"></div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Campos Específicos: Material Litúrgico</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label htmlFor="tituloIcone" className="text-[10px] font-bold text-[#EA9248] uppercase tracking-wider ml-1">Título do Ícone</label>
                        <input
                          type="text"
                          id="tituloIcone"
                          name="tituloIcone"
                          value={formData.tituloIcone}
                          onChange={handleChange}
                          className="w-full bg-white border border-[#EA9248]/30 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#EA9248] focus:ring-1 focus:ring-[#EA9248] transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="corTecido" className="text-[10px] font-bold text-[#EA9248] uppercase tracking-wider ml-1">Cor do tecido</label>
                        <input
                          type="text"
                          id="corTecido"
                          name="corTecido"
                          value={formData.corTecido}
                          onChange={handleChange}
                          className="w-full bg-white border border-[#EA9248]/30 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#EA9248] focus:ring-1 focus:ring-[#EA9248] transition-all"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label htmlFor="outrasNecessidades" className="text-[10px] font-bold text-[#EA9248] uppercase tracking-wider ml-1">Outras necessidades</label>
                        <textarea
                          id="outrasNecessidades"
                          name="outrasNecessidades"
                          value={formData.outrasNecessidades}
                          onChange={handleChange}
                          rows={2}
                          className="w-full bg-white border border-[#EA9248]/30 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#EA9248] focus:ring-1 focus:ring-[#EA9248] transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Coluna Direita: Localização e Termo */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Localização do Serviço *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{id: 'CEV', title: 'Oficial', name: 'CEV'}, {id: 'Outro', title: 'Externo', name: 'Outro Local'}].map((loc) => (
                    <label key={loc.id} className={`flex flex-col gap-1 cursor-pointer transition-all ${
                      formData.local === loc.id 
                      ? 'p-3 rounded-xl border-2 border-[#EA9248] bg-[#EA9248]/10 ring-4 ring-[#EA9248]/10' 
                      : 'p-3 rounded-xl border border-slate-200 hover:border-slate-300'
                    }`}>
                      <input
                        type="radio"
                        name="local"
                        value={loc.id}
                        required
                        checked={formData.local === loc.id}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${formData.local === loc.id ? 'text-[#EA9248]' : 'text-slate-400'}`}>
                        {loc.title}
                      </span>
                      <span className={`text-sm font-bold ${formData.local === loc.id ? 'text-slate-900' : 'text-slate-600'}`}>
                        {loc.name}
                      </span>
                    </label>
                  ))}
                </div>

                <div className={`transition-all duration-500 overflow-hidden ${formData.local === 'Outro' ? 'opacity-100 max-h-32 mt-4' : 'opacity-0 max-h-0'}`}>
                  <div className="relative">
                    <label htmlFor="endereco" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Endereço Completo *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        id="endereco"
                        name="endereco"
                        required={formData.local === 'Outro'}
                        value={formData.endereco}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#EA9248] focus:ring-1 focus:ring-[#EA9248] transition-all placeholder:text-slate-400"
                        placeholder="Rua, Número, Bairro, Cidade"
                      />
                    </div>
                  </div>
                </div>

                {formData.local !== 'Outro' && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-3 hidden lg:block">
                    <p className="text-[11px] text-slate-500 italic">Local padrão selecionado. Se outro local for escolhido, o campo de endereço será exibido aqui.</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Termo de Ciência</label>
                <label className="flex gap-4 p-5 rounded-2xl bg-slate-900 text-white cursor-pointer select-none group transition-transform hover:-translate-y-0.5">
                  <div className="pt-1 shrink-0">
                    <input
                      type="checkbox"
                      name="termoCiencia"
                      id="termoCiencia"
                      required
                      checked={formData.termoCiencia}
                      onChange={handleChange}
                      className="w-5 h-5 accent-[#EA9248] rounded cursor-pointer"
                    />
                  </div>
                  <span className="text-[12px] leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity">
                    Declaro ciência da impossibilidade de <strong className="text-[#EA9248] font-bold">cancelamento</strong> deste agendamento a partir de seu deferimento, com exceção única a casos graves.
                  </span>
                </label>
              </div>

              <div className="pt-4 flex flex-col gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#EA9248] hover:bg-[#d58440] shadow-lg shadow-[#EA9248]/20'} text-white font-black rounded-xl text-sm uppercase tracking-widest transition-all active:scale-[0.98]`}
                >
                  {loading ? 'Enviando...' : 'Enviar Solicitação'}
                </button>
              </div>
            </div>
            
          </form>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}} />
    </div>
  );
}