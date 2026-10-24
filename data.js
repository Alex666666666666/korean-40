/*
 * 韩语 40 音 · 数据
 * 罗马音、字母名、例字按老师给定的数据填写，请勿随意修改。
 * 例字同时也是 audio/<例字>.mp3 的文件名。
 */
window.K40_DATA = (function () {
  'use strict';

  // 辅音：罗马音 / 字母名 / 例字（配 ㅏ）
  var consonants = {
    'ㄱ': { roman: 'g/k', name: '기역', example: '가' },
    'ㄲ': { roman: 'kk', name: '쌍기역', example: '까' },
    'ㄴ': { roman: 'n', name: '니은', example: '나' },
    'ㄷ': { roman: 'd/t', name: '디귿', example: '다' },
    'ㄸ': { roman: 'tt', name: '쌍디귿', example: '따' },
    'ㄹ': { roman: 'r/l', name: '리을', example: '라' },
    'ㅁ': { roman: 'm', name: '미음', example: '마' },
    'ㅂ': { roman: 'b/p', name: '비읍', example: '바' },
    'ㅃ': { roman: 'pp', name: '쌍비읍', example: '빠' },
    'ㅅ': { roman: 's', name: '시옷', example: '사' },
    'ㅆ': { roman: 'ss', name: '쌍시옷', example: '싸' },
    'ㅇ': { roman: '不发音/ng', name: '이응', example: '아' },
    'ㅈ': { roman: 'j', name: '지읒', example: '자' },
    'ㅉ': { roman: 'jj', name: '쌍지읒', example: '짜' },
    'ㅊ': { roman: 'ch', name: '치읓', example: '차' },
    'ㅋ': { roman: 'k', name: '키읔', example: '카' },
    'ㅌ': { roman: 't', name: '티읕', example: '타' },
    'ㅍ': { roman: 'p', name: '피읖', example: '파' },
    'ㅎ': { roman: 'h', name: '히읗', example: '하' }
  };

  // 元音：罗马音 / 例字（配 ㅇ）。元音字母名就是它本身的读音，即例字。
  var vowels = {
    'ㅏ': { roman: 'a', example: '아' },
    'ㅑ': { roman: 'ya', example: '야' },
    'ㅓ': { roman: 'eo', example: '어' },
    'ㅕ': { roman: 'yeo', example: '여' },
    'ㅗ': { roman: 'o', example: '오' },
    'ㅛ': { roman: 'yo', example: '요' },
    'ㅜ': { roman: 'u', example: '우' },
    'ㅠ': { roman: 'yu', example: '유' },
    'ㅡ': { roman: 'eu', example: '으' },
    'ㅣ': { roman: 'i', example: '이' },
    'ㅐ': { roman: 'ae', example: '애' },
    'ㅒ': { roman: 'yae', example: '얘' },
    'ㅔ': { roman: 'e', example: '에' },
    'ㅖ': { roman: 'ye', example: '예' },
    'ㅘ': { roman: 'wa', example: '와' },
    'ㅙ': { roman: 'wae', example: '왜' },
    'ㅚ': { roman: 'oe', example: '외' },
    'ㅝ': { roman: 'wo', example: '워' },
    'ㅞ': { roman: 'we', example: '웨' },
    'ㅟ': { roman: 'wi', example: '위' },
    'ㅢ': { roman: 'ui', example: '의' }
  };
  Object.keys(vowels).forEach(function (k) { vowels[k].name = vowels[k].example; });

  // 4 套辅音：松音 / 送气音 / 紧音
  var consonantColumns = [
    { key: 'lax', label: '松音' },
    { key: 'asp', label: '送气音' },
    { key: 'tense', label: '紧音' }
  ];
  var consonantRows = [
    { label: '双唇', letters: ['ㅂ', 'ㅍ', 'ㅃ'] },
    { label: '舌尖', letters: ['ㄷ', 'ㅌ', 'ㄸ'] },
    { label: '舌根', letters: ['ㄱ', 'ㅋ', 'ㄲ'] },
    { label: '舌尖前', letters: ['ㅈ', 'ㅊ', 'ㅉ'] }
  ];
  var otherConsonants = ['ㅅ', 'ㅆ', 'ㄴ', 'ㅁ', 'ㄹ', 'ㅇ', 'ㅎ'];

  // 元音分组；combo 显示在卡片正面的小字
  var vowelGroups = [
    {
      title: '5 个基本元音',
      rule: '其余元音都由这 5 个组合而来',
      items: [{ ch: 'ㅏ' }, { ch: 'ㅓ' }, { ch: 'ㅗ' }, { ch: 'ㅜ' }, { ch: 'ㅣ' }]
    },
    {
      title: 'i+ 系列',
      rule: 'i + 基本元音：先发 i 再滑向后面的元音，写法上多加一短横（ㅏ→ㅑ、ㅓ→ㅕ、ㅗ→ㅛ、ㅜ→ㅠ）',
      items: [
        { ch: 'ㅑ', combo: 'i+a' }, { ch: 'ㅕ', combo: 'i+ə' },
        { ch: 'ㅛ', combo: 'i+o' }, { ch: 'ㅠ', combo: 'i+u' }
      ]
    },
    {
      title: '+i 系列',
      rule: '基本元音 + i：在右边加一竖 ㅣ（ㅏ+ㅣ=ㅐ、ㅓ+ㅣ=ㅔ、ㅗ+ㅣ=ㅚ、ㅜ+ㅣ=ㅟ）',
      items: [
        { ch: 'ㅐ', combo: 'a+i' }, { ch: 'ㅔ', combo: 'ə+i' },
        { ch: 'ㅚ', combo: 'o+i' }, { ch: 'ㅟ', combo: 'u+i' }
      ]
    },
    {
      title: 'u+ 系列',
      rule: 'u + 基本元音：以 w 开头（ㅗ+ㅏ=ㅘ、ㅜ+ㅓ=ㅝ）',
      items: [{ ch: 'ㅘ', combo: 'u+a' }, { ch: 'ㅝ', combo: 'u+ə' }]
    },
    {
      title: '其他',
      rule: 'ㅡ 为平唇 eu · ㅒ/ㅖ = i+ㅐ / i+ㅔ · ㅙ/ㅞ = u+ㅐ / u+ㅔ · ㅢ = ㅡ+ㅣ',
      items: [{ ch: 'ㅡ' }, { ch: 'ㅒ' }, { ch: 'ㅖ' }, { ch: 'ㅙ' }, { ch: 'ㅞ' }, { ch: 'ㅢ' }]
    }
  ];

  // 对比练习：最小对立词；type 决定卡片底色（松音 / 送气音 / 紧音）
  var pairs = [
    {
      title: 'ㅂ · ㅍ · ㅃ',
      items: [
        { word: '불', meaning: '火', type: 'lax' },
        { word: '풀', meaning: '草', type: 'asp' },
        { word: '뿔', meaning: '角', type: 'tense' }
      ]
    },
    {
      title: 'ㄷ · ㅌ · ㄸ',
      items: [
        { word: '달', meaning: '月亮', type: 'lax' },
        { word: '탈', meaning: '面具', type: 'asp' },
        { word: '딸', meaning: '女儿', type: 'tense' }
      ]
    },
    {
      title: 'ㅈ · ㅊ · ㅉ',
      items: [
        { word: '자다', meaning: '睡觉', type: 'lax' },
        { word: '차다', meaning: '踢、冷', type: 'asp' },
        { word: '짜다', meaning: '咸', type: 'tense' }
      ]
    },
    {
      title: 'ㅂ · ㅍ · ㅃ',
      items: [
        { word: '비다', meaning: '空', type: 'lax' },
        { word: '피다', meaning: '开花', type: 'asp' },
        { word: '삐다', meaning: '扭伤', type: 'tense' }
      ]
    },
    {
      title: 'ㅅ · ㅆ',
      items: [
        { word: '사다', meaning: '买', type: 'lax' },
        { word: '싸다', meaning: '便宜', type: 'tense' }
      ]
    }
  ];

  return {
    consonants: consonants,
    vowels: vowels,
    consonantColumns: consonantColumns,
    consonantRows: consonantRows,
    otherConsonants: otherConsonants,
    vowelGroups: vowelGroups,
    pairs: pairs
  };
})();
