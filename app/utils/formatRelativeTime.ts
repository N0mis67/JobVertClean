export function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
  
    if (diffInDays === 0) {
      return "Publié aujourd'hui";
    } else if (diffInDays === 1) {
      return "Publié il y a 1 jour";
    } else {
      return `Publié il y a ${diffInDays} jours`;
    }
  }