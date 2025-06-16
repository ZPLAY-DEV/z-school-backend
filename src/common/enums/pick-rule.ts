export enum PickRule {
  FIRST = 'FIRST', // first come first served, 선착순
  FORMER = 'FORMER', // former students first, 재수강우선
  RANDOM = 'RANDOM', // random students, 추첨
  ANYONE = 'ANYONE', // anyone, 누구나 (신청만 하면)
}

export enum LimitedPickRule {
  FIRST = 'FIRST',
  RANDOM = 'RANDOM',
}
