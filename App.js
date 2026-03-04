import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Image 
} from 'react-native';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (Escritório)
const urlDb = 'https://uhddyxmflimxakurztoj.supabase.co';
const chaveDb = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZGR5eG1mbGlteGFrurztojIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjg5NTIsImV4cCI6MjA4ODIwNDk1Mn0.TQJjS9ijbeCzsp0KdyhKgc27ouopZTqII66BLU7dtMg';
const supabase = createClient(urlDb, chaveDb);

export default function App() {
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [saldo, setSaldo] = useState(0);
  const [historico, setHistorico] = useState([]);

  // Atualização em Tempo Real (Realtime)
  useEffect(() => { 
    atualizarDados(); 
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimentacoes' }, () => atualizarDados())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function atualizarDados() {
    const { data, error } = await supabase.from('movimentacoes').select('*').order('id', { ascending: false });
    if (!error && data) {
      let total = data.reduce((acc, m) => m.tipo === 'entrada' ? acc + m.valor : acc - m.valor, 0);
      setSaldo(total);
      setHistorico(data);
    }
  }

  async function lancar(tipo) {
    if (!valor || !descricao) return Alert.alert("Atenção", "Preencha o valor e a descrição.");
    
    const valorNumerico = parseFloat(valor.replace(',', '.'));

    const { error } = await supabase.from('movimentacoes').insert([
      { 
        valor: valorNumerico, 
        tipo: tipo, 
        descricao: descricao.toUpperCase(),
        data: new Date().toISOString().split('T')[0] 
      }
    ]);

    if (error) {
      Alert.alert("Erro", "Verifique se o RLS está desativado no Supabase.");
    } else {
      setValor('');
      setDescricao('');
      atualizarDados();
      Alert.alert("Sucesso", "Lançamento registrado!");
    }
  }

  return (
    <View style={styles.container}>
      {/* Cabeçalho com Saldo Total */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PAINEL FINANCEIRO - ESCRITÓRIO</Text>
        <Text style={styles.saldoLabel}>Saldo em Caixa</Text>
        <Text style={styles.saldoValue}>R$ {saldo.toFixed(2)}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Formulário de Lançamento Local */}
        <View style={styles.card}>
          <TextInput 
            style={styles.input} 
            placeholder="Descrição do lançamento" 
            value={descricao} 
            onChangeText={setDescricao} 
          />
          <TextInput 
            style={styles.input} 
            placeholder="Valor R$ 0,00" 
            keyboardType="numeric" 
            value={valor} 
            onChangeText={setValor} 
          />
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnIn]} onPress={() => lancar('entrada')}>
              <Text style={styles.btnTxt}>ENTRADA</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOut]} onPress={() => lancar('saida')}>
              <Text style={styles.btnTxt}>SAÍDA</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* QR Code para o Celular de Terceiros */}
        <View style={styles.qrContainer}>
          <Text style={styles.qrText}>ESCANEIE PARA LANÇAR PELO CELULAR</Text>
          <Image 
            source={require('./qrcode.png')} 
            style={styles.qrImage} 
          />
        </View>

        {/* Listagem de Movimentações */}
        <Text style={styles.sectionTitle}>Histórico de Hoje</Text>
        {historico.map((item) => (
          <View key={item.id} style={styles.histItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.histDesc}>{item.descricao}</Text>
              <Text style={styles.histDate}>{item.data.split('-').reverse().join('/')}</Text>
            </View>
            <Text style={[styles.histVal, { color: item.tipo === 'entrada' ? '#2ecc71' : '#e74c3c' }]}>
              {item.tipo === 'entrada' ? '+' : '-'} R$ {item.valor.toFixed(2)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { backgroundColor: '#1c1c1c', padding: 50, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, alignItems: 'center', elevation: 8 },
  headerTitle: { color: '#888', fontSize: 10, fontWeight: 'bold', marginBottom: 10, letterSpacing: 1 },
  saldoLabel: { color: '#fff', fontSize: 14, opacity: 0.8 },
  saldoValue: { color: '#fff', fontSize: 38, fontWeight: 'bold' },
  content: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 4 },
  input: { borderBottomWidth: 1, borderColor: '#eee', padding: 12, marginBottom: 20, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 0.48, padding: 15, borderRadius: 10, alignItems: 'center' },
  btnIn: { backgroundColor: '#2ecc71' },
  btnOut: { backgroundColor: '#e74c3c' },
  btnTxt: { color: '#fff', fontWeight: 'bold' },
  qrContainer: { alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 25, elevation: 2 },
  qrText: { fontSize: 10, fontWeight: 'bold', color: '#999', marginBottom: 10 },
  qrImage: { width: 140, height: 140 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  histItem: { backgroundColor: '#fff', padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, elevation: 1 },
  histDesc: { fontWeight: 'bold', color: '#444' },
  histDate: { color: '#aaa', fontSize: 11, marginTop: 2 },
  histVal: { fontWeight: 'bold', fontSize: 16 }
});