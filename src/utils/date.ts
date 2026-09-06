const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
});

export const formatDateBRL = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    try {
        return dateFormatter.format(new Date(dateStr));
    } catch {
        return dateStr;
    }
};
