export interface RankingScores {
  recencyScore: number;
  completenessScore: number;
  preferenceMatchScore: number;
  totalScore: number;
}

export interface ProfileForRanking {
  id: string;
  createdAt: Date;
  completeness: number;
  dob?: Date | null;
  gender?: string | null;
  location?: any;
}

export class RankingService {
  calculateRecencyScore(createdAt: Date): number {
    const now = Date.now();
    const created = createdAt.getTime();
    const ageInDays = (now - created) / (1000 * 60 * 60 * 24);

    if (ageInDays <= 1) return 1.0;
    if (ageInDays <= 7) return 0.8;
    if (ageInDays <= 30) return 0.6;
    if (ageInDays <= 90) return 0.4;
    return 0.2;
  }

  calculateCompletenessScore(completeness: number): number {
    return completeness / 100;
  }

  calculatePreferenceMatchScore(
    profile: ProfileForRanking,
    userPreferences?: any
  ): number {
    if (!userPreferences || !userPreferences.basic) {
      return 0.5;
    }

    let score = 0;
    let factors = 0;

    const preferences = userPreferences.basic;

    if (
      Array.isArray(preferences.ageRange) &&
      preferences.ageRange.length === 2 &&
      profile.dob
    ) {
      const age = this.calculateAge(profile.dob);
      const [minAge, maxAge] = preferences.ageRange;
      if (age >= minAge && age <= maxAge) {
        score += 1;
      }
      factors++;
    }

    if (preferences.gender && profile.gender) {
      if (profile.gender === preferences.gender) {
        score += 1;
      }
      factors++;
    }

    if (preferences.location && profile.location) {
      const profileCity = profile.location?.city;
      const preferredCity = preferences.location?.city;

      if (profileCity && preferredCity && profileCity === preferredCity) {
        score += 1;
      }
      factors++;
    }

    return factors > 0 ? score / factors : 0.5;
  }

  calculateTotalScore(
    profile: ProfileForRanking,
    userPreferences?: any,
    weights = { recency: 0.3, completeness: 0.4, preferenceMatch: 0.3 }
  ): RankingScores {
    const recencyScore = this.calculateRecencyScore(profile.createdAt);
    const completenessScore = this.calculateCompletenessScore(profile.completeness);
    const preferenceMatchScore = this.calculatePreferenceMatchScore(profile, userPreferences);

    const totalScore =
      recencyScore * weights.recency +
      completenessScore * weights.completeness +
      preferenceMatchScore * weights.preferenceMatch;

    return {
      recencyScore,
      completenessScore,
      preferenceMatchScore,
      totalScore,
    };
  }

  rankProfiles(
    profiles: ProfileForRanking[],
    userPreferences?: any
  ): ProfileForRanking[] {
    const scored = profiles.map((profile) => ({
      profile,
      score: this.calculateTotalScore(profile, userPreferences).totalScore,
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.map((item) => item.profile);
  }


  private calculateAge(dob: Date): number {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}

export const rankingService = new RankingService();
