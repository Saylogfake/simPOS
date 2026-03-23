using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SaasPos.Backend.Data;
using SaasPos.Backend.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add Services
builder.Services.AddControllers();
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
if (string.IsNullOrEmpty(jwtSecret))
{
    Console.WriteLine("WARNING: JWT_SECRET not configured. Using insecure default. Set JWT_SECRET in Railway Variables.");
    jwtSecret = "INSECURE_DEFAULT_CHANGE_ME_IN_PRODUCTION_12345678901234567890";
}
var key = Encoding.ASCII.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

// CORS (Allow Frontend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var frontendUrl = builder.Configuration["FRONTEND_URL"];
        if (string.IsNullOrEmpty(frontendUrl))
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
        else
            policy.WithOrigins(frontendUrl).AllowAnyMethod().AllowAnyHeader();
    });
});

// Services
builder.Services.AddScoped<InventoryService>();
builder.Services.AddScoped<CashService>();
builder.Services.AddScoped<DebtService>();

var app = builder.Build();

// Migrate on Startup
using (var scope = app.Services.CreateScope())
{
    var serviceProvider = scope.ServiceProvider;
    try
    {
        var db = serviceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();
        Console.WriteLine("Database initialized successfully.");

        // Migrations manuales: agregar columnas nuevas si no existen
        var columnMigrations = new[]
        {
            @"ALTER TABLE ""Products"" ADD COLUMN IF NOT EXISTS ""TenantId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';",
            @"ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""DocumentId"" text NULL;",
            @"ALTER TABLE ""Customers"" ADD COLUMN IF NOT EXISTS ""BirthDate"" timestamp NULL;",
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
        };
        foreach (var sql in columnMigrations)
        {
            try { db.Database.ExecuteSqlRaw(sql); }
            catch (Exception colEx) { Console.WriteLine($"Column migration skipped: {colEx.Message}"); }
        }

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
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Railway asigna el puerto via variable PORT
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
app.Run($"http://0.0.0.0:{port}");
