using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SaasPos.Backend.Data;
using SaasPos.Backend.Middleware;
using SaasPos.Backend.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add Services
builder.Services.AddControllers(options =>
{
    var policy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
    options.Filters.Add(new AuthorizeFilter(policy));
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "SaaS POS API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            new string[] {}
        }
    });
});

// DbContext — solo Postgres
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL");

if (string.IsNullOrEmpty(connectionString))
    throw new InvalidOperationException("No database connection string configured. Set ConnectionStrings__DefaultConnection or DATABASE_URL.");

// Railway genera URLs tipo postgresql://user:pass@host:port/db — convertir a formato Npgsql
if (connectionString.StartsWith("postgresql://") || connectionString.StartsWith("postgres://"))
{
    var uri = new Uri(connectionString);
    connectionString = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={uri.UserInfo.Split(':')[0]};Password={uri.UserInfo.Split(':')[1]};SSL Mode=Require;Trust Server Certificate=true";
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Authentication
var jwtSecret = builder.Configuration["JWT_SECRET"];
var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "simpos";
var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "simpos";
var jwtExpiresInMinutes = builder.Configuration["JWT_EXPIRES_IN_MINUTES"];

if (string.IsNullOrWhiteSpace(jwtSecret))
{
    throw new InvalidOperationException("JWT_SECRET must be configured. Set JWT_SECRET in environment variables.");
}

var jwtLifetimeMinutes = int.TryParse(jwtExpiresInMinutes, out var expires)
    ? expires
    : 10080; // 7 días por defecto

var key = Encoding.ASCII.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // Railway maneja HTTPS en el edge
    options.SaveToken = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});

builder.Services.AddAuthorization();

// CORS — Dynamic: always reflect the Origin header so Railway deploys never break.
// JWT Bearer auth (no cookies) means AllowAnyOrigin is safe here.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

// Services
builder.Services.AddScoped<InventoryService>();
builder.Services.AddScoped<CashService>();
builder.Services.AddScoped<DebtService>();
builder.Services.AddHttpClient<FactPyService>();
builder.Services.Configure<FactPyOptions>(builder.Configuration.GetSection("FactPy"));

// Rate limiting & account lockout (in-memory)
builder.Services.AddSingleton<RateLimitingService>();
builder.Services.AddSingleton<AccountLockoutService>();

var app = builder.Build();

// Migrate on Startup
using (var scope = app.Services.CreateScope())
{
    var serviceProvider = scope.ServiceProvider;
    try
    {
        var db = serviceProvider.GetRequiredService<AppDbContext>();

        // NEVER use EnsureCreated() — it drops & recreates the database when the EF model
        // changes, destroying all client data. Use CREATE TABLE IF NOT EXISTS instead.
        var baseTables = new[]
        {
            @"CREATE TABLE IF NOT EXISTS ""Tenants"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""Name"" text NOT NULL,
                ""Slug"" text NOT NULL,
                ""Email"" text NULL,
                ""Phone"" text NULL,
                ""Address"" text NULL,
                ""LogoUrl"" text NULL,
                ""BusinessType"" text NOT NULL DEFAULT 'TIENDA',
                ""IsActive"" boolean NOT NULL DEFAULT true,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                ""UpdatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"CREATE TABLE IF NOT EXISTS ""Roles"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""Name"" text NOT NULL,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                ""UpdatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"CREATE TABLE IF NOT EXISTS ""Permissions"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""Code"" text NOT NULL,
                ""Description"" text NOT NULL
            );",
            @"CREATE TABLE IF NOT EXISTS ""RolePermissions"" (
                ""RoleId"" uuid NOT NULL,
                ""PermissionId"" uuid NOT NULL,
                PRIMARY KEY (""RoleId"", ""PermissionId"")
            );",
            @"CREATE TABLE IF NOT EXISTS ""Users"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""TenantId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
                ""Name"" text NOT NULL,
                ""Email"" text NOT NULL,
                ""PasswordHash"" text NOT NULL,
                ""RoleId"" uuid NOT NULL,
                ""IsActive"" boolean NOT NULL DEFAULT true,
                ""LastLoginAt"" timestamp NULL,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                ""UpdatedAt"" timestamp NOT NULL DEFAULT now(),
                ""DeletedAt"" timestamp NULL
            );",
            @"CREATE TABLE IF NOT EXISTS ""Categories"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""TenantId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
                ""Name"" text NOT NULL,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                ""UpdatedAt"" timestamp NOT NULL DEFAULT now(),
                ""DeletedAt"" timestamp NULL
            );",
            @"CREATE TABLE IF NOT EXISTS ""Products"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""TenantId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
                ""Name"" text NOT NULL,
                ""Code"" text NULL,
                ""Sku"" text NOT NULL,
                ""InternalCode"" text NOT NULL DEFAULT '',
                ""Barcode"" text NULL,
                ""Price"" numeric(10,2) NOT NULL DEFAULT 0,
                ""Cost"" numeric(10,2) NOT NULL DEFAULT 0,
                ""Stock"" numeric(12,3) NOT NULL DEFAULT 0,
                ""MinStock"" numeric NOT NULL DEFAULT 0,
                ""CategoryId"" uuid NOT NULL,
                ""ImageUrl"" text NULL,
                ""IsActive"" boolean NOT NULL DEFAULT true,
                ""SaleType"" text NOT NULL DEFAULT 'UNIT',
                ""DiscountPercentage"" numeric(5,2) NOT NULL DEFAULT 0,
                ""Status"" text NOT NULL DEFAULT 'ACTIVE',
                ""IsPriority"" boolean NOT NULL DEFAULT false,
                ""ExpirationDate"" timestamp NULL,
                ""IdealStock"" numeric NOT NULL DEFAULT 0,
                ""WholesalePrice"" numeric NOT NULL DEFAULT 0,
                ""WholesaleMinQty"" numeric NOT NULL DEFAULT 0,
                ""TrackStock"" boolean NOT NULL DEFAULT true,
                ""RowVersion"" bytea NULL,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                ""UpdatedAt"" timestamp NOT NULL DEFAULT now(),
                ""DeletedAt"" timestamp NULL
            );",
            @"CREATE TABLE IF NOT EXISTS ""Sales"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""TenantId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
                ""UserId"" uuid NOT NULL,
                ""CustomerId"" uuid NULL,
                ""Total"" numeric(12,2) NOT NULL DEFAULT 0,
                ""Tax"" numeric(12,2) NOT NULL DEFAULT 0,
                ""Discount"" numeric(12,2) NOT NULL DEFAULT 0,
                ""PaymentStatus"" text NOT NULL,
                ""Status"" text NOT NULL,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                ""UpdatedAt"" timestamp NOT NULL DEFAULT now(),
                ""DeletedAt"" timestamp NULL
            );",
            @"CREATE TABLE IF NOT EXISTS ""SaleItems"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""SaleId"" uuid NOT NULL,
                ""ProductId"" uuid NOT NULL,
                ""Quantity"" numeric(12,3) NOT NULL DEFAULT 0,
                ""Price"" numeric(10,2) NOT NULL DEFAULT 0,
                ""Subtotal"" numeric(12,2) NOT NULL DEFAULT 0,
                ""DiscountApplied"" numeric(12,2) NOT NULL DEFAULT 0,
                ""CustomName"" text NULL
            );",
            @"CREATE TABLE IF NOT EXISTS ""Payments"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""SaleId"" uuid NOT NULL,
                ""Method"" text NOT NULL,
                ""Amount"" numeric NOT NULL DEFAULT 0,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"CREATE TABLE IF NOT EXISTS ""StockMovements"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""ProductId"" uuid NOT NULL,
                ""Type"" text NOT NULL,
                ""Quantity"" numeric(12,3) NOT NULL DEFAULT 0,
                ""StockBefore"" numeric NOT NULL DEFAULT 0,
                ""StockAfter"" numeric NOT NULL DEFAULT 0,
                ""Reason"" text NOT NULL,
                ""ReferenceId"" text NULL,
                ""UserId"" uuid NOT NULL,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"CREATE TABLE IF NOT EXISTS ""CashRegisters"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""TenantId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
                ""OpenedByUserId"" uuid NULL,
                ""OpenedAt"" timestamp NOT NULL DEFAULT now(),
                ""OpeningAmount"" numeric(12,2) NOT NULL DEFAULT 0,
                ""ClosedByUserId"" uuid NULL,
                ""ClosedAt"" timestamp NULL,
                ""ClosingAmountCash"" numeric(12,2) NULL,
                ""ExpectedAmountCash"" numeric(12,2) NULL,
                ""DifferenceCash"" numeric(12,2) NULL,
                ""DifferenceReason"" text NULL,
                ""Status"" text NOT NULL,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"CREATE TABLE IF NOT EXISTS ""CashMovements"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""CashRegisterId"" uuid NOT NULL,
                ""Type"" text NOT NULL,
                ""Amount"" numeric(12,2) NOT NULL DEFAULT 0,
                ""PaymentMethod"" text NOT NULL,
                ""Reason"" text NOT NULL,
                ""UserId"" uuid NOT NULL,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"CREATE TABLE IF NOT EXISTS ""CashSalesSummaries"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""CashRegisterId"" uuid NOT NULL,
                ""PaymentMethod"" text NOT NULL,
                ""TotalAmount"" numeric(12,2) NOT NULL DEFAULT 0,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"CREATE TABLE IF NOT EXISTS ""CashAuditLogs"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""CashRegisterId"" uuid NOT NULL,
                ""Action"" text NOT NULL,
                ""PreviousValue"" text NULL,
                ""NewValue"" text NULL,
                ""UserId"" uuid NOT NULL,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"CREATE TABLE IF NOT EXISTS ""Customers"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""TenantId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
                ""Name"" text NOT NULL,
                ""DocumentId"" text NULL,
                ""Phone"" text NULL,
                ""Email"" text NULL,
                ""BirthDate"" timestamp NULL,
                ""CreditLimit"" numeric(12,2) NOT NULL DEFAULT 0,
                ""Balance"" numeric(12,2) NOT NULL DEFAULT 0,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                ""UpdatedAt"" timestamp NOT NULL DEFAULT now(),
                ""DeletedAt"" timestamp NULL
            );",
        };
        foreach (var sql in baseTables)
        {
            try { db.Database.ExecuteSqlRaw(sql); }
            catch (Exception tblEx) { Console.WriteLine($"Base table migration skipped: {tblEx.Message}"); }
        }
        Console.WriteLine("Database initialized successfully.");

        // NOTE: The raw SQL migrations below handle schema evolution safely using
        // CREATE TABLE IF NOT EXISTS and ADD COLUMN IF NOT EXISTS. They never delete data.

        // Migrations manuales: agregar columnas nuevas si no existen
        var columnMigrations = new[]
        {
            // Tablas nuevas
            @"CREATE TABLE IF NOT EXISTS ""CustomerDebts"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""CustomerId"" uuid NOT NULL,
                ""Amount"" numeric(12,2) NOT NULL,
                ""PaidAmount"" numeric(12,2) NOT NULL DEFAULT 0,
                ""DueDate"" timestamp NOT NULL,
                ""Status"" text NOT NULL DEFAULT 'PENDING',
                ""CreatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"CREATE TABLE IF NOT EXISTS ""DebtPayments"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""CustomerDebtId"" uuid NOT NULL,
                ""Amount"" numeric(12,2) NOT NULL,
                ""PaymentMethod"" text NOT NULL,
                ""CashRegisterId"" uuid NOT NULL,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""TenantId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';",
            @"ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""DocumentId"" text NULL;",
            @"ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""BirthDate"" timestamp NULL;",
            // Make Phone/Email nullable in case they were created as NOT NULL
            @"ALTER TABLE ""Customers"" ALTER COLUMN ""Phone"" DROP NOT NULL;",
            @"ALTER TABLE ""Customers"" ALTER COLUMN ""Email"" DROP NOT NULL;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""TrackStock"" boolean NOT NULL DEFAULT true;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""SaleType"" text NOT NULL DEFAULT 'UNIT';",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""DiscountPercentage"" numeric NOT NULL DEFAULT 0;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""IsPriority"" boolean NOT NULL DEFAULT false;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""IdealStock"" numeric NOT NULL DEFAULT 0;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""WholesalePrice"" numeric NOT NULL DEFAULT 0;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""WholesaleMinQty"" numeric NOT NULL DEFAULT 0;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""Status"" text NOT NULL DEFAULT 'ACTIVE';",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""Cost"" numeric NOT NULL DEFAULT 0;",
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""InternalCode"" text NOT NULL DEFAULT '';",
            @"CREATE TABLE IF NOT EXISTS ""Notifications"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""TenantId"" uuid NULL,
                ""Type"" text NOT NULL DEFAULT 'INFO',
                ""Title"" text NOT NULL,
                ""Message"" text NOT NULL,
                ""IsRead"" boolean NOT NULL DEFAULT false,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now()
            );",
            @"CREATE TABLE IF NOT EXISTS ""Invoices"" (
                ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                ""SaleId"" uuid NOT NULL,
                ""TenantId"" uuid NOT NULL,
                ""Status"" text NOT NULL DEFAULT 'PENDING',
                ""ExternalId"" text NULL,
                ""InvoiceNumber"" text NULL,
                ""InvoiceUrl"" text NULL,
                ""ResponseData"" text NULL,
                ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                ""UpdatedAt"" timestamp NOT NULL DEFAULT now()
            );",
        };
        foreach (var sql in columnMigrations)
        {
            try { db.Database.ExecuteSqlRaw(sql); }
            catch (Exception colEx) { Console.WriteLine($"Column migration skipped: {colEx.Message}"); }
        }

            // Migración: tablas del Módulo Óptica
            var opticsMigrations = new[]
            {
                @"CREATE TABLE IF NOT EXISTS ""LensTypes"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                    ""TenantId"" uuid NOT NULL,
                    ""Name"" text NOT NULL,
                    ""BasePrice"" numeric(12,2) NOT NULL DEFAULT 0,
                    ""IsActive"" boolean NOT NULL DEFAULT true,
                    ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                    ""UpdatedAt"" timestamp NOT NULL DEFAULT now()
                );",
                @"CREATE TABLE IF NOT EXISTS ""LensIndexes"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                    ""TenantId"" uuid NOT NULL,
                    ""Name"" text NOT NULL,
                    ""AdditionalPrice"" numeric(12,2) NOT NULL DEFAULT 0,
                    ""IsActive"" boolean NOT NULL DEFAULT true,
                    ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                    ""UpdatedAt"" timestamp NOT NULL DEFAULT now()
                );",
                @"CREATE TABLE IF NOT EXISTS ""LensExtras"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                    ""TenantId"" uuid NOT NULL,
                    ""Name"" text NOT NULL,
                    ""Price"" numeric(12,2) NOT NULL DEFAULT 0,
                    ""IsActive"" boolean NOT NULL DEFAULT true,
                    ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                    ""UpdatedAt"" timestamp NOT NULL DEFAULT now()
                );",
                @"CREATE TABLE IF NOT EXISTS ""GraduationRanges"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                    ""TenantId"" uuid NOT NULL,
                    ""MinValue"" numeric(5,2) NOT NULL DEFAULT 0,
                    ""MaxValue"" numeric(5,2) NOT NULL DEFAULT 0,
                    ""AdditionalCost"" numeric(12,2) NOT NULL DEFAULT 0,
                    ""IsActive"" boolean NOT NULL DEFAULT true,
                    ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                    ""UpdatedAt"" timestamp NOT NULL DEFAULT now()
                );",
                @"CREATE TABLE IF NOT EXISTS ""OpticalPrescriptions"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                    ""TenantId"" uuid NOT NULL,
                    ""OdEsfera"" numeric(5,2) NOT NULL DEFAULT 0,
                    ""OdCilindro"" numeric(5,2) NOT NULL DEFAULT 0,
                    ""OdEje"" numeric(5,2) NOT NULL DEFAULT 0,
                    ""OdAdicion"" numeric(5,2) NOT NULL DEFAULT 0,
                    ""OiEsfera"" numeric(5,2) NOT NULL DEFAULT 0,
                    ""OiCilindro"" numeric(5,2) NOT NULL DEFAULT 0,
                    ""OiEje"" numeric(5,2) NOT NULL DEFAULT 0,
                    ""OiAdicion"" numeric(5,2) NOT NULL DEFAULT 0,
                    ""CreatedAt"" timestamp NOT NULL DEFAULT now()
                );",
                @"CREATE TABLE IF NOT EXISTS ""OpticalQuotes"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                    ""TenantId"" uuid NOT NULL,
                    ""CustomerId"" uuid NULL,
                    ""FrameProductId"" uuid NULL,
                    ""FrameCode"" text NULL,
                    ""FrameDescription"" text NULL,
                    ""FrameBrand"" text NULL,
                    ""FramePrice"" numeric(12,2) NULL,
                    ""LensTypeId"" uuid NULL,
                    ""LensTypeName"" text NULL,
                    ""LensTypeBasePrice"" numeric(12,2) NOT NULL DEFAULT 0,
                    ""LensIndexId"" uuid NULL,
                    ""LensIndexName"" text NULL,
                    ""LensIndexAdditionalPrice"" numeric(12,2) NOT NULL DEFAULT 0,
                    ""PrescriptionId"" uuid NULL,
                    ""GraduationRangeOdId"" uuid NULL,
                    ""GraduationRangeOdCost"" numeric(12,2) NOT NULL DEFAULT 0,
                    ""GraduationRangeOiId"" uuid NULL,
                    ""GraduationRangeOiCost"" numeric(12,2) NOT NULL DEFAULT 0,
                    ""ExtraIds"" text NOT NULL DEFAULT '[]',
                    ""ExtrasTotalCost"" numeric(12,2) NOT NULL DEFAULT 0,
                    ""Subtotal"" numeric(12,2) NOT NULL DEFAULT 0,
                    ""DiscountAmount"" numeric(12,2) NOT NULL DEFAULT 0,
                    ""Total"" numeric(12,2) NOT NULL DEFAULT 0,
                    ""AppliedRules"" text NOT NULL DEFAULT '[]',
                    ""Status"" text NOT NULL DEFAULT 'QUOTE',
                    ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                    ""UpdatedAt"" timestamp NOT NULL DEFAULT now()
                );",
                @"CREATE TABLE IF NOT EXISTS ""PromotionalRules"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                    ""TenantId"" uuid NOT NULL,
                    ""Name"" text NOT NULL,
                    ""Description"" text NOT NULL,
                    ""RuleType"" text NOT NULL,
                    ""TargetId"" text NULL,
                    ""ConditionType"" text NULL,
                    ""ConditionValue"" text NULL,
                    ""BenefitType"" text NULL,
                    ""BenefitValue"" text NULL,
                    ""IsActive"" boolean NOT NULL DEFAULT true,
                    ""StartDate"" timestamp NULL,
                    ""EndDate"" timestamp NULL,
                    ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                    ""UpdatedAt"" timestamp NOT NULL DEFAULT now()
                );",
            };
            foreach (var sql in opticsMigrations)
            {
                try { db.Database.ExecuteSqlRaw(sql); }
                catch (Exception colEx) { Console.WriteLine($"Optics migration skipped: {colEx.Message}"); }
            }

            // Migración: tabla FrameLensRules
            try
            {
                db.Database.ExecuteSqlRaw(@"CREATE TABLE IF NOT EXISTS ""FrameLensRules"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                    ""TenantId"" uuid NOT NULL,
                    ""LensTypeId"" uuid NOT NULL,
                    ""FrameProductId"" uuid NOT NULL,
                    ""SpecialPrice"" numeric(12,2) NOT NULL DEFAULT 0,
                    ""IsActive"" boolean NOT NULL DEFAULT true,
                    ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                    ""UpdatedAt"" timestamp NOT NULL DEFAULT now()
                );");
                Console.WriteLine("FrameLensRules table created.");
            }
            catch (Exception colEx) { Console.WriteLine($"FrameLensRules migration skipped: {colEx.Message}"); }

            // Migración: tabla ProductBarcodes (códigos de barras múltiples por producto)
            try
            {
                db.Database.ExecuteSqlRaw(@"CREATE TABLE IF NOT EXISTS ""ProductBarcodes"" (
                    ""Id"" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                    ""ProductId"" uuid NOT NULL,
                    ""Barcode"" text NOT NULL DEFAULT '',
                    ""Description"" text NULL,
                    ""IsActive"" boolean NOT NULL DEFAULT true,
                    ""CreatedAt"" timestamp NOT NULL DEFAULT now(),
                    CONSTRAINT ""FK_ProductBarcodes_Products"" FOREIGN KEY (""ProductId"") REFERENCES ""Products""(""Id"") ON DELETE CASCADE
                );");
                Console.WriteLine("ProductBarcodes table created.");
            }
            catch (Exception colEx) { Console.WriteLine($"ProductBarcodes migration skipped: {colEx.Message}"); }

            // Migración: CustomName en SaleItem
            try
            {
                db.Database.ExecuteSqlRaw(@"ALTER TABLE ""SaleItems"" ADD COLUMN IF NOT EXISTS ""CustomName"" text NULL;");
                Console.WriteLine("SaleItem.CustomName column added.");
            }
            catch (Exception colEx) { Console.WriteLine($"SaleItem.CustomName migration skipped: {colEx.Message}"); }

            // Migración: cambiar Plan a BusinessType en Tenants (para óptica)
            try
            {
                db.Database.ExecuteSqlRaw(@"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""BusinessType"" text NOT NULL DEFAULT 'TIENDA';");
                db.Database.ExecuteSqlRaw(@"UPDATE ""Tenants"" SET ""BusinessType"" = COALESCE(NULLIF(""Plan"", ''), 'TIENDA') WHERE ""BusinessType"" IS NULL OR ""BusinessType"" = '';");
                Console.WriteLine("BusinessType migration applied.");
            }
            catch (Exception colEx) { Console.WriteLine($"BusinessType migration skipped: {colEx.Message}"); }

            // Migración: campos Branding / Tema en Tenants
            var brandingMigrations = new[]
            {
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""PrimaryColor"" text NULL DEFAULT '#135bec';",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""SecondaryColor"" text NULL DEFAULT '#6366f1';",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""DarkPrimaryColor"" text NULL DEFAULT '#3b82f6';",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""DarkSecondaryColor"" text NULL DEFAULT '#818cf8';",
            };
            foreach (var sql in brandingMigrations)
            {
                try { db.Database.ExecuteSqlRaw(sql); }
                catch (Exception colEx) { Console.WriteLine($"Branding migration skipped: {colEx.Message}"); }
            }

            // Migración: campos SIFEN / e-Kuatia en Tenants
            var sifenMigrations = new[]
            {
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""Ruc"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""RazonSocial"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""NombreFantasia"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""ActividadEconomicaCodigo"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""ActividadEconomicaDescripcion"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""TipoContribuyente"" integer NOT NULL DEFAULT 2;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""TipoRegimen"" integer NOT NULL DEFAULT 8;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""TimbradoNumero"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""TimbradoFecha"" timestamp NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""CodigoEstablecimiento"" text NOT NULL DEFAULT '001';",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""PuntoExpedicion"" text NOT NULL DEFAULT '001';",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""DireccionEstablecimiento"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""Departamento"" integer NOT NULL DEFAULT 11;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""DepartamentoDescripcion"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""Distrito"" integer NOT NULL DEFAULT 145;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""DistritoDescripcion"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""Ciudad"" integer NOT NULL DEFAULT 3432;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""CiudadDescripcion"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""TelefonoEstablecimiento"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""EmailEstablecimiento"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""DenominacionEstablecimiento"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""CertificadoPath"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""CertificadoPassword"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""Csc"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""CscId"" text NULL;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""SifenHabilitado"" boolean NOT NULL DEFAULT false;",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""SifenAmbiente"" text NOT NULL DEFAULT 'test';",
                @"ALTER TABLE ""Tenants"" ADD COLUMN IF NOT EXISTS ""UltimoNumeroDe"" integer NOT NULL DEFAULT 0;",
            };
            foreach (var sql in sifenMigrations)
            {
                try { db.Database.ExecuteSqlRaw(sql); }
                catch (Exception colEx) { Console.WriteLine($"SIFEN migration skipped: {colEx.Message}"); }
            }

        // Fix: limpiar imageUrl con placehold.co (datos sucios de versiones anteriores)
        try
        {
            db.Database.ExecuteSqlRaw(@"UPDATE ""Products"" SET ""ImageUrl"" = NULL WHERE ""ImageUrl"" LIKE '%placehold%';");
            Console.WriteLine("ImageUrl cleanup applied.");
        }
        catch (Exception imgEx) { Console.WriteLine($"ImageUrl cleanup skipped: {imgEx.Message}"); }

        // Fix: si hay productos/categorías con TenantId vacío, asignarles el primer tenant activo
        try
        {
            var firstTenant = db.Tenants.OrderBy(t => t.CreatedAt).FirstOrDefault();
            if (firstTenant != null)
            {
                db.Database.ExecuteSqlRaw($@"
                    UPDATE ""Products"" SET ""TenantId"" = '{firstTenant.Id}'
                    WHERE ""TenantId"" = '00000000-0000-0000-0000-000000000000';
                ");
                db.Database.ExecuteSqlRaw($@"
                    UPDATE ""Categories"" SET ""TenantId"" = '{firstTenant.Id}'
                    WHERE ""TenantId"" = '00000000-0000-0000-0000-000000000000';
                ");
                Console.WriteLine($"TenantId fix applied for tenant: {firstTenant.Name} ({firstTenant.Id})");
            }
        }
        catch (Exception tenantFixEx)
        {
            Console.WriteLine($"TenantId fix skipped: {tenantFixEx.Message}");
        }

        // Seed initial data only when the database is empty (first deploy)
        if (!db.Users.Any())
        {
            Console.WriteLine("Empty database detected — seeding initial data...");
            db.SeedData();
            Console.WriteLine("Database seeded successfully.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"An error occurred during database initialization: {ex.Message}");
    }
}

// Config Pipeline
app.UseForwardedHeaders();

app.UseMiddleware<SecurityHeadersMiddleware>();

// Railway maneja HTTPS en el edge — no redirigir internamente o causa 308 loop
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health check endpoint para Railway
app.MapGet("/health", () => Results.Ok(new { status = "healthy" })).AllowAnonymous();

// Railway inyecta PORT — ASPNETCORE_URLS tiene prioridad si está seteada, por eso la limpiamos
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
Environment.SetEnvironmentVariable("ASPNETCORE_URLS", $"http://0.0.0.0:{port}");

app.Run($"http://0.0.0.0:{port}");
