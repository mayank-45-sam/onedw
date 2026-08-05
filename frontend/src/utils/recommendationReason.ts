import type { Worker } from '@/types';
import { formatCurrency } from '@/utils/format';

export type RecommendationVariant = 'recommended' | 'nearby' | 'fastest' | 'budget' | 'highest-rated';

export interface RecommendationSignals {
  trustScore?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  experienceYears?: number | null;
  completedJobs?: number | null;
  hourlyRate?: number | null;
  isOnline?: boolean | null;
  responseTimeMinutes?: number | null;
  etaMinutes?: number | null;
  distanceKm?: number | null;
  availabilityStatus?: string | null;
  skillMatchScore?: number | null;
  profession?: string | null;
  estimatedArrival?: string | null;
}

export interface RecommendationOptions {
  distanceKm?: number | null;
  etaMinutes?: number | null;
  estimatedPrice?: number | null;
  averagePrice?: number | null;
  savings?: number | null;
}

export function workerToSignals(worker: Worker): RecommendationSignals {
  return {
    trustScore: worker.trustScore,
    rating: worker.rating,
    reviewCount: worker.reviewCount,
    experienceYears: worker.experienceYears,
    completedJobs: worker.completedJobs,
    hourlyRate: worker.hourlyRate,
    isOnline: worker.isOnline,
    responseTimeMinutes: worker.responseTimeMinutes,
    etaMinutes: worker.etaMinutes,
    distanceKm: worker.distanceKm ?? worker.distance,
    availabilityStatus: worker.availabilityStatus,
    skillMatchScore: worker.skillMatchScore,
    profession: worker.profession,
  };
}

const MAX_LINES = 4;
const MIN_LINES = 2;

function trimLines(lines: string[], signals: RecommendationSignals): string[] {
  if (lines.length > MAX_LINES) return lines.slice(0, MAX_LINES);
  if (lines.length < MIN_LINES) {
    if (signals.rating != null && !lines.some((l) => l.includes('rating'))) {
      lines.push(`Rated ${signals.rating.toFixed(1)}★ by past customers.`);
    }
  }
  if (lines.length < MIN_LINES && signals.profession) {
    lines.push(`${signals.profession} specialist.`);
  }
  if (lines.length < MIN_LINES) {
    lines.push('A verified professional on OneDW.');
  }
  return lines;
}

function availabilityText(signals: RecommendationSignals): string | null {
  if (signals.availabilityStatus === 'available_now') return 'currently available';
  if (signals.isOnline) return 'currently online';
  return null;
}

function ratingText(signals: RecommendationSignals): string | null {
  if (signals.rating == null) return null;
  const star = signals.rating.toFixed(1);
  const reviews = signals.reviewCount != null ? ` from ${signals.reviewCount} reviews` : '';
  return `rated ${star}★${reviews}`;
}

function recommendedReason(signals: RecommendationSignals): string[] {
  const lines: string[] = [];
  const trust = signals.trustScore;
  const rating = signals.rating;
  const reviews = signals.reviewCount;
  const exp = signals.experienceYears;
  const jobs = signals.completedJobs;
  const match = signals.skillMatchScore;
  const rt = signals.responseTimeMinutes;
  const avail = availabilityText(signals);

  if (trust != null) {
    const ratingPart = rating != null ? ` and a ${rating.toFixed(1)}★ rating` : '';
    lines.push(
      trust >= 90
        ? `Highly trusted with a ${trust}/100 trust score${ratingPart}.`
        : `Trust score of ${trust}/100${ratingPart}.`
    );
  } else if (rating != null) {
    lines.push(`Top pick with a ${rating.toFixed(1)}★ rating.`);
  }

  if (exp != null && jobs != null) {
    lines.push(`${exp} years of experience and ${jobs} successful jobs completed.`);
  } else if (exp != null) {
    lines.push(`${exp} years of experience.`);
  } else if (jobs != null) {
    lines.push(`${jobs} successful jobs completed.`);
  }

  if (match != null) {
    lines.push(`${Math.round(match * 100)}% match for the service you need.`);
  }

  if (rt != null || avail != null) {
    const rtPart = rt != null ? `~${rt} min response` : null;
    lines.push([rtPart, avail ? `${avail}` : null].filter(Boolean).join(', ') + '.');
  }

  if (reviews != null && (rating == null || rating < 4.5)) {
    lines.push(`Backed by ${reviews} customer reviews.`);
  }

  if (rating != null && rating >= 4.5) {
    lines.push('Customers consistently rate the work quality highly.');
  }

  return trimLines(lines, signals);
}

function nearbyReason(signals: RecommendationSignals): string[] {
  const lines: string[] = [];
  const dist = signals.distanceKm;
  const eta = signals.etaMinutes;
  const avail = availabilityText(signals);

  if (dist != null) {
    const distPart = dist < 1 ? `less than a km away` : `only ${dist.toFixed(1)} km away`;
    const availPart = avail ? ` and is ${avail}` : '';
    lines.push(`This worker is ${distPart} from your location${availPart}.`);
  } else if (avail) {
    lines.push(`This worker is ${avail} and close to your area.`);
  }

  if (eta != null) {
    lines.push(`Estimated arrival time of about ${eta} minutes.`);
  }

  const rating = ratingText(signals);
  if (rating) lines.push(`A well-regarded pro, ${rating}.`);

  return trimLines(lines, signals);
}

function fastestReason(signals: RecommendationSignals): string[] {
  const lines: string[] = [];
  const rt = signals.responseTimeMinutes;
  const eta = signals.etaMinutes;

  if (rt != null && eta != null) {
    lines.push(
      `One of the fastest responders (~${rt} min) and can reach you in about ${eta} minutes.`
    );
  } else if (rt != null) {
    lines.push(`One of the fastest responders on OneDW (~${rt} min average response).`);
  } else if (eta != null) {
    lines.push(`Can reach your location in approximately ${eta} minutes.`);
  }

  if (signals.isOnline) {
    lines.push('Online right now — no waiting for a reply.');
  } else if (signals.availabilityStatus === 'available_now') {
    lines.push('Currently available to take your job.');
  }

  const rating = ratingText(signals);
  if (rating) lines.push(`Still keeps a strong ${rating}.`);

  return trimLines(lines, signals);
}

function budgetReason(signals: RecommendationSignals, options: RecommendationOptions): string[] {
  const lines: string[] = [];
  const price = options.estimatedPrice ?? signals.hourlyRate;
  const savings = options.savings;

  if (price != null && savings != null && savings > 0) {
    lines.push(
      `Affordable at ${formatCurrency(price)}/hr — save ${formatCurrency(savings)} vs typical rates.`
    );
  } else if (price != null) {
    lines.push(`One of the most affordable rates at ${formatCurrency(price)}/hr.`);
  }

  if (signals.rating != null) {
    lines.push(`Keeps a ${signals.rating.toFixed(1)}★ customer rating.`);
  }

  if (signals.trustScore != null) {
    lines.push(`Trust score of ${signals.trustScore}/100.`);
  }

  const rating = ratingText(signals);
  if (rating && lines.length < MIN_LINES) lines.push(`Great balance between price and quality, ${rating}.`);

  return trimLines(lines, signals);
}

function highestRatedReason(signals: RecommendationSignals): string[] {
  const lines: string[] = [];
  const rating = signals.rating;
  const reviews = signals.reviewCount;

  if (rating != null) {
    const reviewPart = reviews != null ? ` from ${reviews} reviews` : '';
    lines.push(`Top rated at ${rating.toFixed(1)}★${reviewPart}.`);
  }

  if (signals.completedJobs != null) {
    lines.push(`${signals.completedJobs} successful jobs completed.`);
  }

  if (signals.trustScore != null) {
    lines.push(`Trusted with a ${signals.trustScore}/100 trust score.`);
  }

  if (signals.experienceYears != null) {
    lines.push(`${signals.experienceYears} years of experience.`);
  }

  if (rating != null && rating >= 4.5) {
    lines.push('Customers consistently praise the work quality.');
  }

  return trimLines(lines, signals);
}

export function buildRecommendationReason(
  variant: RecommendationVariant,
  signals: RecommendationSignals,
  options: RecommendationOptions = {}
): string[] {
  const merged: RecommendationSignals = {
    ...signals,
    distanceKm: options.distanceKm ?? signals.distanceKm,
    etaMinutes: options.etaMinutes ?? signals.etaMinutes,
  };
  switch (variant) {
    case 'nearby':
      return nearbyReason(merged);
    case 'fastest':
      return fastestReason(merged);
    case 'budget':
      return budgetReason(merged, options);
    case 'highest-rated':
      return highestRatedReason(merged);
    case 'recommended':
    default:
      return recommendedReason(merged);
  }
}
