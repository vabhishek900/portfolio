const BASE = window.location.protocol === 'file:' ? 'http://localhost:5164' : '';
const apiUrl = BASE + '/api/portfolio/hero';

const COUNTRY_CODES = {
  '1':'United States / Canada','7':'Russia','20':'Egypt','27':'South Africa',
  '30':'Greece','31':'Netherlands','32':'Belgium','33':'France','34':'Spain',
  '36':'Hungary','39':'Italy','40':'Romania','41':'Switzerland','43':'Austria',
  '44':'United Kingdom','45':'Denmark','46':'Sweden','47':'Norway','48':'Poland',
  '49':'Germany','51':'Peru','52':'Mexico','54':'Argentina','55':'Brazil',
  '56':'Chile','57':'Colombia','58':'Venezuela','60':'Malaysia','61':'Australia',
  '62':'Indonesia','63':'Philippines','64':'New Zealand','65':'Singapore',
  '66':'Thailand','81':'Japan','82':'South Korea','84':'Vietnam','86':'China',
  '90':'Turkey','91':'India','92':'Pakistan','94':'Sri Lanka','98':'Iran',
  '212':'Morocco','213':'Algeria','216':'Tunisia','234':'Nigeria','254':'Kenya',
  '255':'Tanzania','256':'Uganda','971':'UAE','972':'Israel','973':'Bahrain',
  '974':'Qatar','977':'Nepal','992':'Tajikistan','994':'Azerbaijan',
  '995':'Georgia','996':'Kyrgyzstan','998':'Uzbekistan'
};

function validatePhone(phone) {
  if (!phone || !phone.trim()) return { valid: true };
  var raw = phone.trim();
  if (raw.charAt(0) !== '+') return { valid: false, error: 'Phone must start with + and country code (e.g. +1, +44, +91).' };
  var digits = raw.slice(1).replace(/[\s\-.()\[\]]/g, '');
  if (!/^\d+$/.test(digits)) return { valid: false, error: 'Only digits, spaces, dashes, or parentheses allowed after +.' };
  var code = null, country = null;
  for (var len = 3; len >= 1; len--) {
    var c = digits.substring(0, len);
    if (COUNTRY_CODES[c]) { code = c; country = COUNTRY_CODES[c]; break; }
  }
  if (!code) return { valid: false, error: 'Country code not recognized. Use a valid code (e.g. +1, +44, +91).' };
  var subscriber = digits.slice(code.length);
  if (subscriber.length < 4)  return { valid: false, error: 'Number too short after country code +' + code + '.' };
  if (subscriber.length > 10) return { valid: false, error: 'Max 10 digits allowed after country code +' + code + '.' };
  return { valid: true, country: country, code: code };
}

const app = angular.module('portfolioApp', []);
app.controller('HeroCtrl', ['$http','$timeout','$interval', function($http,$timeout,$interval){
  const vm = this;

  vm.content = {
    Name: 'Abhishek V Desai',
    Headline: '.NET & SQL Developer | 9+ Years',
    Tagline: ['ASP.NET Core','SQL Server','Azure DP-300','Angular 8-14','PySpark ETL'],
    ResumeUrl: './Abhishek_Desai_Resume.pdf',
    LinkedInUrl: 'https://www.linkedin.com/in/abhishek-v-desai-273594311',
    Email: 'avdesai900@gmail.com',
    Phone: '+1(540)-724-1408'
  };

  vm.skills = vm.content.Tagline;
  vm.skillsByCategory = [];
  vm.stats = [];
  vm.projects = [];
  vm.filteredProjects = [];
  vm.projectFilter = 'All';
  vm.certifications = [];
  vm.azureCerts = [];
  vm.education = [];
  vm.domainExpertise = [];
  vm.technologies = [];
  vm.technologiesByCategory = {};
  vm.testimonials = [];

  vm.showcaseIndex  = 0;
  vm.showcasePaused = false;
  vm.progressPct    = 0;
  vm.showcaseTabs   = [
    'Professional Overview',
    'Skills & Proficiency',
    'Key Results',
    'Certifications & Education',
    'Technology & Azure'
  ];
  vm.currentTestimonialIndex = 0;
  vm.testimonialTimer = null;
  vm.activeTechTooltip = null;
  vm.typed = '';

  // Contact form
  vm.leadTypes = [
    { value: 'Full-Time Role',   label: 'Full-Time Role' },
    { value: 'Contract',         label: 'Contract' },
    { value: 'Consulting',       label: 'Consulting' },
    { value: 'Just Networking',  label: 'Just Networking' }
  ];
  vm.contactForm = { name: '', email: '', company: '', phone: '', leadType: '', message: '', website: '' };
  vm.contactStatus     = null;
  vm.contactError      = '';
  vm.contactSuccess    = '';
  vm.contactSubmitting = false;
  vm.phoneHint         = '';
  vm.phoneErr          = '';

  vm.onPhoneChange = function() {
    var result = validatePhone(vm.contactForm.phone);
    if (!vm.contactForm.phone || !vm.contactForm.phone.trim()) {
      vm.phoneHint = ''; vm.phoneErr = '';
    } else if (result.valid && result.country) {
      vm.phoneHint = result.country + ' (+' + result.code + ')';
      vm.phoneErr  = '';
    } else if (!result.valid) {
      vm.phoneErr  = result.error;
      vm.phoneHint = '';
    } else {
      vm.phoneHint = ''; vm.phoneErr = '';
    }
  };

  let currentIndex = 0;
  let currentChar = 0;
  let isDeleting = false;

  function typeLoop() {
    const currentWord = vm.skills[currentIndex];

    if (!isDeleting) {
      if (currentChar < currentWord.length) {
        currentChar += 1;
        vm.typed = currentWord.substring(0, currentChar);
      } else {
        isDeleting = true;
        $timeout(typeLoop, 1200);
        return;
      }
    } else {
      if (currentChar > 0) {
        currentChar -= 1;
        vm.typed = currentWord.substring(0, currentChar);
      } else {
        isDeleting = false;
        currentIndex = (currentIndex + 1) % vm.skills.length;
      }
    }

    const delay = isDeleting ? 50 : 120;
    $timeout(typeLoop, delay);
  }

  function loadHeroContent() {
    $http.get(apiUrl)
      .then(function(response) {
        if (response.data) {
          vm.content = response.data;
          vm.skills = Array.isArray(vm.content.Tagline) ? vm.content.Tagline : vm.content.Tagline?.split(',') || vm.skills;
        }
      })
      .catch(function() {
        console.warn('API hero content not available; using local fallback data.');
      });
  }

  function loadExperience() {
    $http.get(BASE + '/api/portfolio/experience')
      .then(function(response) {
        vm.experience = Array.isArray(response.data) ? response.data.map(function(item) {
          item.Achievements = typeof item.Achievements === 'string' ? JSON.parse(item.Achievements) : item.Achievements || [];
          item.Environment = item.Environment || '';
          return item;
        }) : [];
      })
      .catch(function() {
        vm.experience = [];
        console.warn('Experience API not available; timeline will remain empty.');
      });
  }

  vm.donutColors = ['#06b6d4','#6366f1','#8b5cf6','#f59e0b','#10b981','#ec4899','#3b82f6','#f97316'];
  vm.hoveredIndex = -1;
  var hoverCharts = [];

  vm.hoverSkill = function(index) { vm.hoveredIndex = index; };
  vm.leaveSkill = function()      { vm.hoveredIndex = -1;    };

  var donutChartConfig = {
    type: 'doughnut',
    options: {
      responsive: false,
      cutout: '60%',
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(3,12,28,0.96)',
          titleColor: '#06b6d4',
          bodyColor: '#e2efff',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function(ctx) {
              var v = ctx.parsed;
              var level = v >= 90 ? 'Expert' : v >= 80 ? 'Advanced' : v >= 70 ? 'Proficient' : 'Familiar';
              return '  ' + v + '% — ' + level;
            }
          }
        }
      }
    }
  };

  function buildDonutDataset(cat) {
    return {
      labels: cat.Skills.map(function(s) { return s.Name; }),
      datasets: [{
        data: cat.Skills.map(function(s) { return s.ProficiencyPct; }),
        backgroundColor: vm.donutColors.slice(0, cat.Skills.length),
        borderColor: 'rgba(4,20,38,0.9)',
        borderWidth: 2,
        hoverOffset: 8
      }]
    };
  }

  function renderAllDonutCharts() {
    if (typeof Chart === 'undefined') return;
    hoverCharts.forEach(function(c) { if (c) c.destroy(); });
    hoverCharts = [];
    vm.skillsByCategory.forEach(function(cat, i) {
      var canvas = document.getElementById('skill-hover-chart-' + i);
      if (!canvas) return;
      hoverCharts[i] = new Chart(canvas, angular.extend({}, donutChartConfig, { data: buildDonutDataset(cat) }));
    });
  }

  var scDonutCharts = [];

  function renderShowcaseDonutCharts() {
    if (typeof Chart === 'undefined' || !vm.skillsByCategory.length) return;
    scDonutCharts.forEach(function(c) { if (c) c.destroy(); });
    scDonutCharts = [];
    vm.skillsByCategory.forEach(function(cat, i) {
      var canvas = document.getElementById('sc-chart-' + i);
      if (!canvas) return;
      scDonutCharts[i] = new Chart(canvas, angular.extend({}, donutChartConfig, { data: buildDonutDataset(cat) }));
    });
  }

  function loadSkills() {
    $http.get(BASE + '/api/portfolio/skills')
      .then(function(response) {
        vm.skillsByCategory = Array.isArray(response.data) ? response.data : [];
        $timeout(function() { renderAllDonutCharts(); renderShowcaseDonutCharts(); }, 200);
      })
      .catch(function() {
        vm.skillsByCategory = [];
        console.warn('Skills API not available; skills section will remain empty.');
      });
  }

  function loadProjects() {
    $http.get(BASE + '/api/portfolio/projects')
      .then(function(response) {
        vm.projects = Array.isArray(response.data) ? response.data : [];
        vm.filteredProjects = vm.projects;
      })
      .catch(function() {
        vm.projects = [];
        vm.filteredProjects = [];
        console.warn('Projects API not available; project cards will remain empty.');
      });
  }

  function filterProjects(category) {
    vm.projectFilter = category;
    if (category === 'All') {
      vm.filteredProjects = vm.projects;
    } else {
      vm.filteredProjects = vm.projects.filter(function(project) {
        return project.Industry === category;
      });
    }
  }
  vm.filterProjects = filterProjects;

  function loadStats() {
    $http.get(BASE + '/api/portfolio/metrics')
      .then(function(response) {
        vm.stats = Array.isArray(response.data) ? response.data.map(function(item) {
          return {
            AchievementId: item.AchievementId,
            MetricValue: item.MetricValue,
            MetricPercent: item.MetricPercent || parseInt(item.MetricValue, 10) || 0,
            MetricLabel: item.MetricLabel,
            CompanySource: item.CompanySource,
            CurrentValue: 0
          };
        }) : [];
        $timeout(watchStatsSection, 150);
      })
      .catch(function() {
        vm.stats = [];
        console.warn('Metrics API not available; key numbers section will remain empty.');
      });
  }

  function animateStatCounts() {
    vm.stats.forEach(function(stat) {
      var target = stat.MetricPercent || 0;
      var duration = 1200;
      var start = performance.now();

      function step(timestamp) {
        var progress = Math.min((timestamp - start) / duration, 1);
        stat.CurrentValue = Math.round(target * progress);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          stat.CurrentValue = target;
        }
        $timeout(function() {}, 0);
      }

      requestAnimationFrame(step);
    });
  }

  function watchStatsSection() {
    var section = document.getElementById('stats');
    if (!section || !window.IntersectionObserver) {
      animateStatCounts();
      return;
    }

    var observer = new IntersectionObserver(function(entries, observerInstance) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          animateStatCounts();
          observerInstance.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });

    observer.observe(section);
  }

  function loadCertifications() {
    $http.get(BASE + '/api/portfolio/certifications')
      .then(function(response) {
        vm.certifications = Array.isArray(response.data) ? response.data : [];
        vm.azureCerts = vm.certifications.filter(function(cert) {
          return (cert.Name && cert.Name.toUpperCase().includes('DP-300')) || (cert.Name && cert.Name.toUpperCase().includes('AZ-900'));
        });
      })
      .catch(function() {
        vm.certifications = [];
        vm.azureCerts = [];
        console.warn('Certifications API not available.');
      });
  }

  function loadEducation() {
    $http.get(BASE + '/api/portfolio/education')
      .then(function(response) {
        vm.education = Array.isArray(response.data) ? response.data : [];
      })
      .catch(function() {
        vm.education = [];
        console.warn('Education API not available.');
      });
  }

  function loadTechnologies() {
    $http.get(BASE + '/api/portfolio/technologies')
      .then(function(response) {
        vm.technologies = Array.isArray(response.data) ? response.data.map(function(tech) {
          return Object.assign({}, tech, {
            DisplayName: tech.Name === 'SQL Server' ? 'SQL Server 2000-2019' : tech.Name === 'Oracle' ? 'Oracle 9i-11g' : tech.Name
          });
        }) : [];
        vm.technologiesByCategory = vm.technologies.reduce(function(acc, tech) {
          var category = tech.Category || 'Other';
          if (!acc[category]) acc[category] = [];
          acc[category].push(tech);
          return acc;
        }, {});
      })
      .catch(function() {
        vm.technologies = [];
        vm.technologiesByCategory = {};
        console.warn('Technologies API not available.');
      });
  }

  function startTestimonialRotation() {
    if (vm.testimonialTimer) {
      $timeout.cancel(vm.testimonialTimer);
    }
    if (!vm.testimonials.length) {
      return;
    }
    vm.testimonialTimer = $timeout(function rotate() {
      vm.currentTestimonialIndex = (vm.currentTestimonialIndex + 1) % vm.testimonials.length;
      vm.testimonialTimer = $timeout(rotate, 4000);
    }, 4000);
  }

  function loadTestimonials() {
    $http.get(BASE + '/api/portfolio/testimonials')
      .then(function(response) {
        vm.testimonials = Array.isArray(response.data) ? response.data : [];
        vm.currentTestimonialIndex = 0;
        startTestimonialRotation();
      })
      .catch(function() {
        vm.testimonials = [];
        console.warn('Testimonials API not available.');
      });
  }

  vm.goToTestimonial = function(index) {
    vm.currentTestimonialIndex = index;
    startTestimonialRotation();
  };

  vm.showTechTooltip = function(event, tech) {
    vm.activeTechTooltip = tech.TechId;
  };

  vm.hideTechTooltip = function() {
    vm.activeTechTooltip = null;
  };

  function loadDomainExpertise() {
    $http.get(BASE + '/api/portfolio/domain-expertise')
      .then(function(response) {
        vm.domainExpertise = Array.isArray(response.data) ? response.data.map(function(item) {
          return {
            DomainId: item.DomainId,
            Name: item.Name,
            Icon: item.Icon,
            Headline: item.Headline,
            Bullets: typeof item.Bullets === 'string' ? JSON.parse(item.Bullets) : item.Bullets || [],
            TechChips: item.TechChips ? item.TechChips.split(',').map(function(chip) { return chip.trim(); }) : []
          };
        }) : [];
      })
      .catch(function() {
        vm.domainExpertise = [];
        console.warn('Domain Expertise API not available.');
      });
  }

  var _CYCLE_MS      = 5000;
  var _TICK_MS       = 50;
  var _cycleElapsed  = 0;
  var _cycleInterval = null;

  function startCycle() {
    if (_cycleInterval) $interval.cancel(_cycleInterval);
    _cycleElapsed    = 0;
    vm.progressPct   = 0;
    _cycleInterval   = $interval(function() {
      if (vm.showcasePaused) return;
      _cycleElapsed   += _TICK_MS;
      vm.progressPct   = Math.min((_cycleElapsed / _CYCLE_MS) * 100, 100);
      if (_cycleElapsed >= _CYCLE_MS) {
        _cycleElapsed    = 0;
        vm.progressPct   = 0;
        vm.showcaseIndex = (vm.showcaseIndex + 1) % vm.showcaseTabs.length;
      }
    }, _TICK_MS);
  }

  vm.goToShowcase = function(index) {
    vm.showcaseIndex = index;
    _cycleElapsed    = 0;
    vm.progressPct   = 0;
  };

  vm.pauseShowcase  = function() { vm.showcasePaused = true; };
  vm.resumeShowcase = function() { vm.showcasePaused = false; };

  vm.submitContact = function() {
    if (vm.contactSubmitting) return;

    if (!vm.contactForm.name || !vm.contactForm.name.trim()) {
      vm.contactStatus = 'error';
      vm.contactError  = 'Please enter your name.';
      return;
    }
    if (!vm.contactForm.email || !vm.contactForm.email.trim()) {
      vm.contactStatus = 'error';
      vm.contactError  = 'Please enter your email address.';
      return;
    }
    if (!vm.contactForm.leadType) {
      vm.contactStatus = 'error';
      vm.contactError  = 'Please select an opportunity type.';
      return;
    }
    if (!vm.contactForm.message || !vm.contactForm.message.trim()) {
      vm.contactStatus = 'error';
      vm.contactError  = 'Please enter a message.';
      return;
    }

    var phoneCheck = validatePhone(vm.contactForm.phone);
    if (!phoneCheck.valid) {
      vm.contactStatus = 'error';
      vm.contactError  = phoneCheck.error;
      return;
    }

    vm.contactSubmitting = true;
    vm.contactStatus     = null;

    $http.post(BASE + '/api/portfolio/contact', {
      name:     vm.contactForm.name,
      email:    vm.contactForm.email,
      company:  vm.contactForm.company  || null,
      phone:    vm.contactForm.phone    || null,
      leadType: vm.contactForm.leadType,
      message:  vm.contactForm.message,
      website:  vm.contactForm.website  || ''
    })
    .then(function(response) {
      vm.contactStatus  = 'success';
      vm.contactSuccess = response.data.message || 'Message sent! I\'ll be in touch soon.';
      vm.contactForm    = { name: '', email: '', company: '', phone: '', leadType: '', message: '', website: '' };
    })
    .catch(function(error) {
      vm.contactStatus = 'error';
      if (error.status === 429) {
        vm.contactError = 'Too many submissions — please try again in an hour.';
      } else if (error.data && error.data.message) {
        vm.contactError = error.data.message;
      } else {
        vm.contactError = 'Something went wrong. Please email me directly at avdesai900@gmail.com';
      }
    })
    .finally(function() {
      vm.contactSubmitting = false;
    });
  };

  function initScrollspy() {
    var navLinks  = document.querySelectorAll('.nav-link');
    var nav       = document.getElementById('site-nav');
    var backToTop = document.getElementById('back-to-top');
    var sections  = ['stats','experience','projects','expertise','contact'];
    window.addEventListener('scroll', function() {
      var scrollY = window.scrollY;

      if (nav)       nav.classList.toggle('scrolled', scrollY > 60);
      if (backToTop) backToTop.classList.toggle('visible', scrollY > 400);

      var current = '';
      sections.forEach(function(id) {
        var el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) current = id;
      });
      navLinks.forEach(function(link) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    });

    if (backToTop) {
      backToTop.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  loadHeroContent();
  loadExperience();
  loadSkills();
  loadProjects();
  loadStats();
  loadCertifications();
  loadEducation();
  loadTechnologies();
  loadTestimonials();
  loadDomainExpertise();
  typeLoop();
  initScrollspy();
  startCycle();
}]);