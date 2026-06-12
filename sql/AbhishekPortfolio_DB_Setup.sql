-- ============================================================
--  Abhishek Desai | Portfolio Website — Full DB Setup Script
--  SQL Server 2016+  |  Run in SSMS or Azure Data Studio
--  Covers all 10 portfolio sections from PromptLibrary
-- ============================================================

-- ── 0. CREATE DATABASE ───────────────────────────────────────
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'AbhishekPortfolioDB')
BEGIN
    CREATE DATABASE AbhishekPortfolioDB;
    PRINT 'Database AbhishekPortfolioDB created.';
END
GO
USE AbhishekPortfolioDB;
GO

-- ── 1. HERO / LANDING ────────────────────────────────────────
IF OBJECT_ID('dbo.HeroContent', 'U') IS NULL
CREATE TABLE dbo.HeroContent (
    HeroId       INT IDENTITY(1,1) PRIMARY KEY,
    Name         NVARCHAR(100)  NOT NULL,
    Headline     NVARCHAR(200)  NOT NULL,
    Tagline      NVARCHAR(500)  NULL,        -- JSON array for typing effect, e.g. ["ASP.NET Core","SQL Server"]
    ResumeUrl    NVARCHAR(500)  NULL,
    LinkedInUrl  NVARCHAR(500)  NULL,
    Email        NVARCHAR(200)  NULL,
    Phone        NVARCHAR(50)   NULL,
    UpdatedOn    DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);
GO

-- Seed
IF NOT EXISTS (SELECT 1 FROM dbo.HeroContent)
INSERT INTO dbo.HeroContent (Name, Headline, Tagline, ResumeUrl, Email, Phone, LinkedInUrl)
VALUES (
    'Abhishek Desai',
    '.NET & SQL Developer | 9+ Years Enterprise Experience | Finance · Real Estate · Healthcare',
    '["ASP.NET Core","SQL Server","Azure DP-300","Angular 8-14","PySpark ETL"]',
    '/Abhishek_Desai_Resume.pdf',
    'avdesai900@gmail.com',
    '+1 (540)-724-1408',
    'https://linkedin.com/in/abhishek-v-desai-273594311'
);
GO

-- ── 2. WORK EXPERIENCE TIMELINE ──────────────────────────────
IF OBJECT_ID('dbo.WorkExperience', 'U') IS NULL
CREATE TABLE dbo.WorkExperience (
    JobId        INT IDENTITY(1,1) PRIMARY KEY,
    Company      NVARCHAR(200)  NOT NULL,
    Project      NVARCHAR(200)  NULL,
    Role         NVARCHAR(200)  NOT NULL,
    StartDate    DATE           NOT NULL,
    EndDate      DATE           NULL,        -- NULL = Present
    Achievements NVARCHAR(MAX)  NULL,        -- JSON array of bullet strings
    Environment  NVARCHAR(MAX)  NULL,        -- comma-separated tech tags
    SortOrder    INT            NOT NULL DEFAULT 0
);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.WorkExperience)
BEGIN
    INSERT INTO dbo.WorkExperience (Company, Project, Role, StartDate, EndDate, Achievements, Environment, SortOrder)
    VALUES
    ('Prompt Realty & Mortgage', NULL, '.NET / SQL Developer', '2024-06-01', NULL,
     '["60% faster API response via SQL Profiler + query rewrite","Micro Frontend SPAs cut front-end delivery effort by 25%","Migrated SQL Server data mart to Azure SQL Database with zero data loss"]',
     'Angular 10-14,TypeScript,C#.NET,ASP.NET Core,Web API,Entity Framework Core,SQL Server,Azure SQL,SSIS,Power BI,Jenkins,Azure DevOps', 1),

    ('Citigroup', 'ASPEN Development Project', 'Data Engineer / Software Developer', '2022-02-01', '2024-06-01',
     '["30% faster query response via composite indexes","25% compliance accuracy improvement via PySpark ETL","Containerised ASPEN using Docker eliminating environment mismatch"]',
     'Angular 12+,AngularJS,C#.NET,ASP.NET,MVC,Web API,SQL Server,Azure SQL MI,Azure Data Factory,PySpark,SSIS,Autosys,Power BI,Docker', 2),

    ('Citigroup', 'MSOffice-NPOI Migration', '.NET / Database Developer', '2021-01-01', '2022-02-01',
     '["35% faster document generation via set-based SQL refactor","30% reduction in batch metadata processing time","Led full MSOffice COM to NPOI migration"]',
     'AngularJS,C#.NET,VB.NET,ASP.NET MVC,ADO.NET,SQL Server,Oracle,PySpark,NPOI,Git', 3),

    ('Citigroup', 'Inventory Tracking Application', '.NET Developer', '2019-08-01', '2021-01-01',
     '["25% system performance improvement via SQL Server Agent batch job restructuring","Full timestamped audit trail via DML triggers","Migrated SQL scripts from TFS to Git"]',
     'AngularJS,Angular,C#.NET,.NET Core,ASP.NET Core,Web API,SQL Server,SSIS,Autosys,ngrx,TypeScript,MSTest', 4),

    ('Humana', 'MedEvoSites', '.NET Developer', '2019-04-01', '2019-08-01',
     '["Optimised SQL Server stored procedures for patient record retrieval under high concurrency","Integrated ASP.NET Web API with SSIS ETL for clinical data ingestion","Reduced UAT rework by translating regulatory constraints into scoped dev tasks"]',
     'AngularJS,ReactJS,TypeScript,C#,ASP.NET MVC,ASP.NET Core,Web API,Entity Framework,MS SQL Server,SSIS,Autosys', 5),

    ('Lamda India', 'Website and Product Information', 'Web / UI Developer', '2014-01-01', '2016-12-31',
     '["Built responsive healthcare e-commerce pages with ReactJS and Node.js REST APIs","Managed SQL Server structures and SSIS ETL for product catalog","Delivered UI updates aligned with client business priorities"]',
     'HTML5,CSS3,ReactJS,JavaScript,Bootstrap,Node.js,MS SQL Server,SSIS,Python,Git', 6);
END
GO

-- ── 3. SKILLS ────────────────────────────────────────────────
IF OBJECT_ID('dbo.SkillCategory', 'U') IS NULL
CREATE TABLE dbo.SkillCategory (
    CategoryId  INT IDENTITY(1,1) PRIMARY KEY,
    Name        NVARCHAR(100) NOT NULL,
    IconClass   NVARCHAR(100) NULL,
    SortOrder   INT           NOT NULL DEFAULT 0
);
GO

IF OBJECT_ID('dbo.Skill', 'U') IS NULL
CREATE TABLE dbo.Skill (
    SkillId        INT IDENTITY(1,1) PRIMARY KEY,
    CategoryId     INT           NOT NULL REFERENCES dbo.SkillCategory(CategoryId),
    Name           NVARCHAR(100) NOT NULL,
    ProficiencyPct TINYINT       NOT NULL CHECK (ProficiencyPct BETWEEN 0 AND 100),
    SortOrder      INT           NOT NULL DEFAULT 0
);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SkillCategory)
BEGIN
    INSERT INTO dbo.SkillCategory (Name, IconClass, SortOrder) VALUES
    ('.NET Stack',       'fa-code',          1),
    ('Databases & BI',   'fa-database',      2),
    ('Data Engineering', 'fa-cogs',          3),
    ('Web & UI',         'fa-desktop',       4),
    ('Languages',        'fa-terminal',      5),
    ('Cloud & DevOps',   'fa-cloud',         6);

    DECLARE @NetId    INT = SCOPE_IDENTITY() - 5,
            @DbId     INT = SCOPE_IDENTITY() - 4,
            @DeId     INT = SCOPE_IDENTITY() - 3,
            @WebId    INT = SCOPE_IDENTITY() - 2,
            @LangId   INT = SCOPE_IDENTITY() - 1,
            @CloudId  INT = SCOPE_IDENTITY();

    INSERT INTO dbo.Skill (CategoryId, Name, ProficiencyPct, SortOrder) VALUES
    (@NetId, 'ASP.NET Core',        95, 1), (@NetId, 'Web API',             95, 2),
    (@NetId, 'Entity Framework',    90, 3), (@NetId, 'ADO.NET',             90, 4),
    (@NetId, 'Microservices',       85, 5), (@NetId, 'WCF / WPF',           80, 6),

    (@DbId, 'SQL Server 2000-2019', 95, 1), (@DbId, 'Oracle 9i-11g',        85, 2),
    (@DbId, 'Azure SQL Database',   90, 3), (@DbId, 'SSIS / SSRS',          90, 4),
    (@DbId, 'Power BI (DAX)',       85, 5),

    (@DeId, 'PySpark',              85, 1), (@DeId, 'Azure Data Factory',   80, 2),
    (@DeId, 'ETL Pipeline Design',  90, 3), (@DeId, 'Autosys / SQL Agent',  85, 4),

    (@WebId, 'Angular 8-14',        80, 1), (@WebId, 'AngularJS',           85, 2),
    (@WebId, 'ReactJS',             75, 3), (@WebId, 'TypeScript',          85, 4),
    (@WebId, 'Bootstrap / jQuery',  85, 5),

    (@LangId, 'C#',                 95, 1), (@LangId, 'T-SQL',              95, 2),
    (@LangId, 'PL/SQL',             85, 3), (@LangId, 'Python',             80, 4),
    (@LangId, 'VB.NET',             80, 5),

    (@CloudId, 'Azure SQL MI',      90, 1), (@CloudId, 'Azure DevOps',      85, 2),
    (@CloudId, 'Docker',            80, 3), (@CloudId, 'Jenkins CI/CD',     85, 4),
    (@CloudId, 'Git',               90, 5);
END
GO

-- ── 4. ACHIEVEMENTS / KPI METRICS ───────────────────────────
IF OBJECT_ID('dbo.Achievement', 'U') IS NULL
CREATE TABLE dbo.Achievement (
    AchievementId INT IDENTITY(1,1) PRIMARY KEY,
    MetricValue   NVARCHAR(20)  NOT NULL,   -- e.g. "60%"
    MetricLabel   NVARCHAR(200) NOT NULL,
    Context       NVARCHAR(500) NULL,
    CompanySource NVARCHAR(200) NULL,
    SortOrder     INT           NOT NULL DEFAULT 0
);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Achievement)
INSERT INTO dbo.Achievement (MetricValue, MetricLabel, Context, CompanySource, SortOrder) VALUES
('60%', 'Faster API Response',          'SQL Profiler + query rewrite + indexed views',               'Prompt Realty & Mortgage', 1),
('40%', 'Better DB Read Performance',   'Indexed views and stored procedure refactoring',             'Prompt Realty & Mortgage', 2),
('35%', 'Faster Audit Retrieval',       'T-SQL triggers + history tables for compliance audit trail', 'Citigroup ASPEN',          3),
('30%', 'Faster Query Response',        'Composite indexes + stored procedure optimisation',          'Citigroup ASPEN',          4),
('25%', 'Front-End Delivery Savings',   'Reusable Angular TypeScript component library',              'Prompt Realty & Mortgage', 5),
('25%', 'Compliance Accuracy Gain',     'Automated PySpark ETL validation workflows',                 'Citigroup ASPEN',          6);
GO

-- ── 5. PROJECTS ──────────────────────────────────────────────
IF OBJECT_ID('dbo.Project', 'U') IS NULL
CREATE TABLE dbo.Project (
    ProjectId       INT IDENTITY(1,1) PRIMARY KEY,
    Title           NVARCHAR(200) NOT NULL,
    Company         NVARCHAR(200) NOT NULL,
    Industry        NVARCHAR(50)  NOT NULL,   -- Finance | Real Estate | Healthcare
    Description     NVARCHAR(MAX) NULL,
    MetricHighlight NVARCHAR(200) NULL,
    Tags            NVARCHAR(500) NULL,       -- comma-separated tech tags
    SortOrder       INT           NOT NULL DEFAULT 0
);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Project)
INSERT INTO dbo.Project (Title, Company, Industry, Description, MetricHighlight, Tags, SortOrder) VALUES
('Property Search Platform',          'Prompt Realty & Mortgage', 'Real Estate',
 'Full-stack property search and lead management platform with Micro Frontend Angular 14, OAuth2-secured REST APIs, and SSIS-powered SQL Server data mart.',
 '60% faster API response', 'Angular 14,ASP.NET Core,SQL Server,SSIS,Power BI,OAuth2,Azure SQL', 1),

('ASPEN Compliance System',           'Citigroup', 'Finance',
 'Role-aware compliance SPA processing millions of customer interaction records via PySpark ETL. Migrated to Azure SQL Managed Instance with zero data loss.',
 '25% compliance accuracy gain', 'AngularJS,PySpark,Azure SQL MI,Azure Data Factory,Docker,ngrx', 2),

('MSOffice to NPOI Migration',        'Citigroup', 'Finance',
 'Re-engineered bookmark-driven Word template processing, eliminating server Office dependency. PySpark batch workflows with partitioning cut metadata processing by 30%.',
 '35% faster document generation', 'ASP.NET MVC,PySpark,Oracle,Azure SQL,C#,NPOI', 3),

('Inventory Tracking Risk Registry',  'Citigroup', 'Finance',
 'Role-aware SPA for MIS teams, risk registry owners, and attestation users with ngrx state management, SSIS ETL, and full timestamped audit trail via DML triggers.',
 '25% performance improvement', 'Angular,ngrx,ASP.NET Web API,SQL Server,SSIS,Autosys', 4),

('MedEvoSites Clinical Platform',     'Humana', 'Healthcare',
 'Patient record APIs and clinical SSIS ETL bridging ASP.NET MVC with third-party medical data feeds. Regulatory constraints translated into scoped dev tasks reducing UAT rework.',
 'Reduced UAT rework', 'ASP.NET Core,ReactJS,SQL Server,SSIS,Entity Framework,Autosys', 5);
GO

-- ── 6. CERTIFICATIONS ────────────────────────────────────────
IF OBJECT_ID('dbo.Certification', 'U') IS NULL
CREATE TABLE dbo.Certification (
    CertId     INT IDENTITY(1,1) PRIMARY KEY,
    Name       NVARCHAR(200) NOT NULL,
    Issuer     NVARCHAR(200) NOT NULL,
    BadgeUrl   NVARCHAR(500) NULL,
    VerifyUrl  NVARCHAR(500) NULL,
    IssuedOn   DATE          NULL,
    SortOrder  INT           NOT NULL DEFAULT 0
);
GO

IF OBJECT_ID('dbo.Education', 'U') IS NULL
CREATE TABLE dbo.Education (
    EduId       INT IDENTITY(1,1) PRIMARY KEY,
    Degree      NVARCHAR(200) NOT NULL,
    Institution NVARCHAR(200) NOT NULL,
    GradYear    SMALLINT      NULL,
    Description NVARCHAR(MAX) NULL,
    SortOrder   INT           NOT NULL DEFAULT 0
);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Certification)
INSERT INTO dbo.Certification (Name, Issuer, VerifyUrl, SortOrder) VALUES
('Azure Database Administrator Associate (DP-300)', 'Microsoft', 'https://learn.microsoft.com/en-us/certifications/azure-database-administrator-associate/', 1),
('Azure Fundamentals (AZ-900)',                     'Microsoft', 'https://learn.microsoft.com/en-us/certifications/azure-fundamentals/', 2),
('MySQL Bootcamp',                                  'Udemy',     NULL, 3);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Education)
INSERT INTO dbo.Education (Degree, Institution, GradYear, SortOrder) VALUES
('Master of Science in Information Systems', 'Marshall University',           2018, 1),
('Bachelor of Computer Engineering',         'Gujarat Technological University', 2015, 2);
GO

-- ── 7. DOMAIN EXPERTISE ──────────────────────────────────────
IF OBJECT_ID('dbo.DomainExpertise', 'U') IS NULL
CREATE TABLE dbo.DomainExpertise (
    DomainId  INT IDENTITY(1,1) PRIMARY KEY,
    Name      NVARCHAR(100) NOT NULL,
    Icon      NVARCHAR(100) NULL,
    Headline  NVARCHAR(300) NOT NULL,
    Bullets   NVARCHAR(MAX) NULL,   -- JSON array
    TechChips NVARCHAR(500) NULL,   -- comma-separated
    SortOrder INT           NOT NULL DEFAULT 0
);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.DomainExpertise)
INSERT INTO dbo.DomainExpertise (Name, Icon, Headline, Bullets, TechChips, SortOrder) VALUES
('Finance',      '🏦', 'Enterprise Compliance & Data Engineering at Citigroup',
 '["ASPEN compliance SPA processing millions of records","PySpark ETL with automated validation workflows","Azure SQL Managed Instance migration with zero data loss","DML audit triggers with full timestamped trail","Power BI KPI dashboards for leadership"]',
 'PySpark,Azure SQL MI,AngularJS,SQL Server,Docker,Power BI', 1),

('Real Estate',  'fa-building',  'Full-Stack Property Platform at Prompt Realty',
 '["Micro Frontend Angular 14 SPA with reusable component library","OAuth2-secured REST APIs for lead and property search","SSIS-powered SQL Server data mart for Power BI","60% API response improvement via SQL Profiler","Azure SQL Database migration with DP-300 practices"]',
 'Angular 14,ASP.NET Core,SQL Server,SSIS,Power BI,OAuth2,Azure SQL', 2),

('Healthcare',   'fa-heartbeat', 'Clinical Data Integration at Humana',
 '["Patient record APIs bridging ASP.NET MVC and SSIS ETL","Clinical data transformation with Entity Framework","Compliance requirement translation reducing UAT rework","Autosys-scheduled enterprise pipeline monitoring"]',
 'ASP.NET Core,ReactJS,SQL Server,SSIS,Entity Framework,Autosys', 3);
GO

-- ── 8. TECH STACK ITEMS ──────────────────────────────────────
IF OBJECT_ID('dbo.TechItem', 'U') IS NULL
CREATE TABLE dbo.TechItem (
    TechId    INT IDENTITY(1,1) PRIMARY KEY,
    Name      NVARCHAR(100) NOT NULL,
    Category  NVARCHAR(100) NOT NULL,
    LogoUrl   NVARCHAR(500) NULL,
    YearsExp  TINYINT       NULL,
    UsedAt    NVARCHAR(500) NULL,   -- comma-separated companies
    SortOrder INT           NOT NULL DEFAULT 0
);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.TechItem)
INSERT INTO dbo.TechItem (Name, Category, YearsExp, UsedAt, SortOrder) VALUES
('C#',                '.NET',           9,  'Prompt Realty,Citigroup,Humana',           1),
('ASP.NET Core',      '.NET',           6,  'Prompt Realty,Citigroup,Humana',           2),
('Entity Framework',  '.NET',           6,  'Prompt Realty,Humana',                     3),
('SQL Server',        'Databases',      9,  'Prompt Realty,Citigroup,Humana,Lamda',     1),
('Oracle',            'Databases',      5,  'Citigroup NPOI',                           2),
('Azure SQL',         'Databases',      3,  'Prompt Realty,Citigroup',                  3),
('Power BI',          'Databases',      4,  'Prompt Realty,Citigroup',                  4),
('PySpark',           'Data Eng',       4,  'Citigroup',                                1),
('SSIS',              'Data Eng',       7,  'Prompt Realty,Citigroup,Humana,Lamda',     2),
('Azure Data Factory','Data Eng',       2,  'Citigroup',                                3),
('Angular 8-14',      'Web & UI',       5,  'Prompt Realty,Citigroup',                  1),
('AngularJS',         'Web & UI',       6,  'Citigroup,Humana',                         2),
('ReactJS',           'Web & UI',       3,  'Humana,Lamda',                             3),
('TypeScript',        'Web & UI',       5,  'Prompt Realty,Citigroup',                  4),
('Azure DevOps',      'Cloud & DevOps', 3,  'Prompt Realty,Citigroup',                  1),
('Docker',            'Cloud & DevOps', 3,  'Citigroup',                                2),
('Jenkins',           'Cloud & DevOps', 4,  'Prompt Realty',                            3),
('Git',               'Cloud & DevOps', 7,  'Prompt Realty,Citigroup,Humana,Lamda',     4);
GO

-- ── 9. TESTIMONIALS ──────────────────────────────────────────
IF OBJECT_ID('dbo.Testimonial', 'U') IS NULL
CREATE TABLE dbo.Testimonial (
    TestimonialId INT IDENTITY(1,1) PRIMARY KEY,
    AuthorName    NVARCHAR(100) NOT NULL,
    AuthorTitle   NVARCHAR(200) NULL,
    Company       NVARCHAR(200) NULL,
    Quote         NVARCHAR(MAX) NOT NULL,
    Rating        TINYINT       NOT NULL DEFAULT 5 CHECK (Rating BETWEEN 1 AND 5),
    IsApproved    BIT           NOT NULL DEFAULT 0,
    SortOrder     INT           NOT NULL DEFAULT 0
);
GO

-- Placeholder until real LinkedIn recommendations are added
IF NOT EXISTS (SELECT 1 FROM dbo.Testimonial)
INSERT INTO dbo.Testimonial (AuthorName, AuthorTitle, Company, Quote, Rating, IsApproved, SortOrder) VALUES
('[ Your Manager Name ]', 'Engineering Manager', 'Prompt Realty & Mortgage',
 'Paste your LinkedIn recommendation here. Set IsApproved = 1 to display it on the site.', 5, 0, 1),
('[ Your Manager Name ]', 'VP of Engineering',   'Citigroup',
 'Paste your LinkedIn recommendation here. Set IsApproved = 1 to display it on the site.', 5, 0, 2),
('[ Your Manager Name ]', 'Tech Lead',            'Humana',
 'Paste your LinkedIn recommendation here. Set IsApproved = 1 to display it on the site.', 5, 0, 3);
GO

-- ── 10. CONTACT LEADS ────────────────────────────────────────
IF OBJECT_ID('dbo.ContactLead', 'U') IS NULL
CREATE TABLE dbo.ContactLead (
    LeadId      INT IDENTITY(1,1) PRIMARY KEY,
    Name        NVARCHAR(200) NOT NULL,
    Email       NVARCHAR(200) NOT NULL,
    Company     NVARCHAR(200) NULL,
    Phone       NVARCHAR(50)  NULL,
    LeadType    NVARCHAR(50)  NOT NULL,   -- Full-Time Role | Contract | Consulting | Just Networking
    Message     NVARCHAR(1000) NOT NULL,
    Source      NVARCHAR(100) NULL,
    SubmittedOn DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    IsRead      BIT           NOT NULL DEFAULT 0,
    Notes       NVARCHAR(MAX) NULL
);
GO

-- Stored proc for admin lead summary
IF OBJECT_ID('dbo.sp_GetLeadSummary', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_GetLeadSummary;
GO
CREATE PROCEDURE dbo.sp_GetLeadSummary
    @Days INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        LeadType,
        COUNT(*)           AS TotalLeads,
        SUM(CASE WHEN IsRead = 0 THEN 1 ELSE 0 END) AS UnreadLeads,
        MAX(SubmittedOn)   AS LastSubmittedOn
    FROM dbo.ContactLead
    WHERE SubmittedOn >= DATEADD(DAY, -@Days, GETUTCDATE())
    GROUP BY LeadType
    ORDER BY TotalLeads DESC;
END
GO

-- ── VERIFY ALL TABLES CREATED ────────────────────────────────
SELECT
    t.name            AS TableName,
    p.rows            AS [RowCount]
FROM sys.tables t
JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0,1)
WHERE t.schema_id = SCHEMA_ID('dbo')
ORDER BY t.name;
GO

PRINT '✅ AbhishekPortfolioDB setup complete — all 10 tables ready.';
GO
