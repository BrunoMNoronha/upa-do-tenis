cat src/lib/ordens-servico-financeiro.ts | awk '
/function somarPagamentos/ {
  in_somar_pag = 1;
}
in_somar_pag && /const total = pagamentos\.reduce/ {
  print "  let total = 0;";
  print "  for (const pagamento of pagamentos) {";
  print "    total += normalizarDecimalParaNumero(pagamento?.valor, 0);";
  print "  }";
  print "";
  in_reduce = 1;
  next;
}
in_reduce && /}, 0);/ {
  in_reduce = 0;
  next;
}
!in_reduce {
  print $0;
}
'
