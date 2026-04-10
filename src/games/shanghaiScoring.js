export const SHANGHAI_SCORING_MODE = Object.freeze({
  FLAT: 'Flat Scoring',
  RING: 'Ring Scoring',
  STANDARD: 'Standard (Multiplier) Scoring'
});

export function normalizeShanghaiScoringMode(mode){
  const validModes = Object.values(SHANGHAI_SCORING_MODE);
  return validModes.includes(mode) ? mode : SHANGHAI_SCORING_MODE.STANDARD;
}

export function getShanghaiAwardedScore(
  round,
  target,
  multiplier,
  score = target * multiplier,
  scoringMode = SHANGHAI_SCORING_MODE.STANDARD
){
  const mode = normalizeShanghaiScoringMode(scoringMode);
  if(target === 'MISS' || multiplier <= 0){
    return 0;
  }

  if(target !== round){
    return 0;
  }

  if(mode === SHANGHAI_SCORING_MODE.RING){
    return multiplier;
  }

  if(mode === SHANGHAI_SCORING_MODE.FLAT){
    return 1;
  }

  return score;
}

export function getShanghaiRoundTotal(entries, roundLabel){
  return entries.reduce((sum, entry) => {
    if(typeof entry.awardedScore === 'number'){
      return sum + entry.awardedScore;
    }
    return sum + (entry.target === roundLabel ? entry.score : 0);
  }, 0);
}