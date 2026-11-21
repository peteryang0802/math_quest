// 第1关：用字母表示数（基础关，10题，限时6分钟）
export const level1 = {
  id: 'algebra',
  name: '用字母表示数',
  short: '字母表示数',
  emoji: '🔤',
  color: '#3b82f6',
  duration: 360,
  questions: [
    {
      no: 1,
      stem: '比 a 的 3 倍还多 2 的数，用代数式表示是（ ）',
      options: [{ t: '3a+2' }, { t: '3(a+2)' }, { t: '3a−2' }, { t: 'a+2' }],
      answer: 0,
      point: '列代数式',
      source: '参照北京区七上期末真题题型改编'
    },
    {
      no: 2,
      stem: 'x 与 y 的和的一半，用代数式表示是（ ）',
      options: [{ t: 'x+y÷2' }, { t: '(x+y)÷2' }, { t: 'x÷2+y' }, { t: '2(x+y)' }],
      answer: 1,
      point: '列代数式',
      source: '参照北京区七上期末真题题型改编'
    },
    {
      no: 3,
      stem: '当 a=2 时，代数式 3a+1 的值是（ ）',
      options: [{ t: '5' }, { t: '6' }, { t: '7' }, { t: '8' }],
      answer: 2,
      point: '代数式求值',
      source: '参照北京区七上期末真题题型改编'
    },
    {
      no: 4,
      stem: '当 x=3 时，代数式 x²−4 的值是（ ）',
      options: [{ t: '2' }, { t: '5' }, { t: '9' }, { t: '1' }],
      answer: 1,
      point: '代数式求值',
      source: '参照北京区七上期末真题题型改编'
    },
    {
      no: 5,
      stem: '单项式 −5x² 的系数是（ ）',
      options: [{ t: '5' }, { t: '−5' }, { t: '2' }, { t: '−5x' }],
      answer: 1,
      point: '单项式的系数',
      source: '参照北京区七上期末真题题型改编'
    },
    {
      no: 6,
      stem: '单项式 3ab 的次数是（ ）',
      options: [{ t: '1' }, { t: '2' }, { t: '3' }, { t: '4' }],
      answer: 1,
      point: '单项式的次数',
      source: '参照北京区七上期末真题题型改编'
    },
    {
      no: 7,
      stem: '下列各组代数式中，属于同类项的是（ ）',
      options: [{ t: '2x 和 2y' }, { t: '3x² 和 3x' }, { t: '2x 和 5x' }, { t: 'ab 和 abc' }],
      answer: 2,
      point: '同类项',
      source: '参照北京区七上期末真题题型改编'
    },
    {
      no: 8,
      stem: '化简 3x+2x，结果是（ ）',
      options: [{ t: '5x' }, { t: '6x' }, { t: '5' }, { t: 'x' }],
      answer: 0,
      point: '合并同类项',
      source: '参照北京区七上期末真题题型改编'
    },
    {
      no: 9,
      stem: '化简 4a−2a+3，结果是（ ）',
      options: [{ t: '5a' }, { t: '2a+3' }, { t: '6a+3' }, { t: '2a' }],
      answer: 1,
      point: '整式加减',
      source: '参照北京区七上期末真题题型改编'
    },
    {
      no: 10,
      stem: '当 a=1、b=2 时，代数式 2a+b 的值是（ ）',
      options: [{ t: '3' }, { t: '4' }, { t: '5' }, { t: '6' }],
      answer: 1,
      point: '代数式求值',
      source: '参照北京区七上期末真题题型改编'
    }
  ]
};
