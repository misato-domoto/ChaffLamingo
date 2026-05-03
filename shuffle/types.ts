/**
 * シャッフル機能で扱うドメイン型をまとめる。
 * 画面ローカル (このフォルダ内) でしか使わないので components/shuffle/ に置く。
 * 別画面でも再利用するようになったら lib/types/ などに昇格させる想定。
 */

export type Member = {
  /** ユニークなID。後でDB保存になっても変わらないキーとして使う。 */
  id: string;
  /** 表示名。 */
  name: string;
  /** チェックボックスでの選択状態 (= シャッフル対象に含めるか)。 */
  selected: boolean;
};
