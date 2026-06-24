interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function fetchAddress(cep: string): Promise<ViaCepResponse | null> {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
    const data: ViaCepResponse = await response.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}
