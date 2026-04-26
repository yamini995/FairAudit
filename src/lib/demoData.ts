import { Row } from './types';

// Simple seeded PRNG
function createSeededRandom(seed: number) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function generateHiringData(): Row[] {
  const random = createSeededRandom(123);
  const data: Row[] = [];
  const races = ['White', 'Black', 'Hispanic', 'Asian'];
  const genders = ['M', 'F', 'Non-binary'];
  const depts = ['ENG', 'SAL', 'HR', 'MKT'];

  for (let i = 0; i < 500; i++) {
    const gender = genders[Math.floor(random() * genders.length)];
    const race = races[Math.floor(random() * races.length)];
    const dept = depts[Math.floor(random() * depts.length)];
    const yearsExp = Math.floor(random() * 15);
    
    // Create bias: Female candidates in ENG hired less
    let hired = random() > 0.6 ? 1 : 0;
    if (gender === 'F' && dept === 'ENG') {
      hired = random() > 0.8 ? 1 : 0;
    }
    if (race === 'Black') {
      hired = random() > 0.75 ? 1 : 0;
    }

    data.push({
      id: i + 1,
      gender,
      race,
      years_experience: yearsExp,
      department: dept,
      education_level: random() > 0.5 ? 'Masters' : 'Bachelors',
      hired
    });
  }
  return data;
}

export function generateLoanData(): Row[] {
  const random = createSeededRandom(456);
  const data: Row[] = [];
  const zipCodes = ['10001', '90210', '30303', '60606'];

  for (let i = 0; i < 500; i++) {
    const age = 22 + Math.floor(random() * 50);
    const gender = random() > 0.5 ? 'M' : 'F';
    const zipCode = zipCodes[Math.floor(random() * zipCodes.length)];
    const income = 30000 + random() * 100000;
    
    // Bias: Certain zip codes get rejected more (redlining proxy)
    let approved = random() > 0.4 ? 1 : 0;
    if (zipCode === '30303') {
      approved = random() > 0.7 ? 1 : 0;
    }

    data.push({
      id: i + 1,
      age,
      gender,
      zip_code: zipCode,
      income: Math.round(income),
      credit_score: 500 + Math.floor(random() * 300),
      loan_approved: approved
    });
  }
  return data;
}

export function generateContentData(): Row[] {
  const random = createSeededRandom(789);
  const data: Row[] = [];
  const ageGroups = ['18-24', '25-34', '35-44', '45+'];

  for (let i = 0; i < 500; i++) {
    const ageGroup = ageGroups[Math.floor(random() * ageGroups.length)];
    const gender = random() > 0.5 ? 'M' : 'F';
    
    // Bias: Recommendation steering
    let engaged = random() > 0.5 ? 1 : 0;
    const contentType = gender === 'F' ? (random() > 0.7 ? 'Educational' : 'Entertainment') : (random() > 0.3 ? 'Educational' : 'Entertainment');

    data.push({
      id: i + 1,
      user_age_group: ageGroup,
      gender,
      session_length: Math.floor(random() * 60),
      content_type_shown: contentType,
      engaged
    });
  }
  return data;
}
