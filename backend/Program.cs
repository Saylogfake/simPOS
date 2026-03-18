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

// DbContext — usa Postgres si la connection string empieza con "Host=", SQLite en caso contrario
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connectionString))
{
    Console.WriteLine("WARNING: DefaultConnection not configured. Using SQLite fallback. Set ConnectionStrings__DefaultConnection in Railway Variables.");
    connectionString = "Data Source=/app/fallback.db";
}

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (connectionString.StartsWith("Host=", StringComparison.OrdinalIgnoreCase))
        options.UseNpgsql(connectionString);
    else
        options.UseSqlite(connectionString);
});

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
        db.Database.Migrate();
        Console.WriteLine("Database migration completed successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"An error occurred during database migration: {ex.Message}");
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

app.Run();
