import { Alert, Platform, type AlertButton } from 'react-native';

// No navegador o Alert do React Native não aparece. Aqui ele vira
// window.alert / window.confirm para as mensagens funcionarem na versão web.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');
    const cancel = (buttons ?? []).find((b) => b.style === 'cancel');

    if (actions.length <= 1 && !cancel) {
      window.alert(text);
      actions[0]?.onPress?.();
      return;
    }
    if (actions.length === 1) {
      if (window.confirm(text)) actions[0].onPress?.();
      else cancel?.onPress?.();
      return;
    }
    // várias opções: pede o número da opção
    const list = actions.map((b, i) => `${i + 1}. ${b.text}`).join('\n');
    const answer = window.prompt(`${text}\n\n${list}\n\nDigite o número da opção:`);
    const idx = Number(answer) - 1;
    if (actions[idx]) actions[idx].onPress?.();
    else cancel?.onPress?.();
  };
}
