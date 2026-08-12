# RideTracks Pro

This is my project and I will share you the prompt that led to the project after that, I will write what I need you to do on this project now.

TrackUber V2 - Complete Dashboard & UX Redesign

Project Goal

Design the application to focus on simplicity, speed, and clarity.

The target user is an Uber/Bolt driver who wants to answer three questions every day:

How much did I earn?

How much will my fleet partner pay me?

How much profit did I actually make?

The application should calculate everything else automatically.

The design should feel modern, clean, mobile-first, and easy to use while driving or between trips.

Design Style

The UI should have:

Clean spacing

Minimal cards

Rounded corners

Soft shadows

Professional typography

Consistent colors

No unnecessary widgets

Plenty of white space

Think of a finance app like:

Revolut

Stripe Dashboard

Linear

Notion

Avoid visual clutter.

Navigation

Desktop

Left Sidebar

Dashboard

Daily Entry

History

Reports

Settings

Profile

Mobile

Bottom Navigation

Dashboard

Entry

History

Settings

Profile

The Dashboard should always open first.

Dashboard

Section 1 — Overview Cards

Only show four cards.

Gross Revenue

Total revenue before deductions.

Expected Partner Payment

Automatically calculate

Gross Revenue

− Cash Collected

− Fleet Commission

Total Expenses

Automatically include

Fuel

Food

Repairs

Other

Weekly Fleet App Fee

Net Profit ⭐

Largest card.

Most important KPI.

Gross Revenue

− Fleet Commission

− Expenses

Section 2 — Charts

Revenue Trend

Line Chart

Daily revenue.

Profit Trend

Line Chart

Daily profit.

Expense Breakdown

Pie Chart

Fuel

Food

Repairs

Other

Weekly Fee

Revenue Breakdown

Pie Chart

Card Revenue

Cash Revenue

Section 3 — Daily Summary Table

DateGrossCashExpensesProfit

Clicking a row opens that day's record.

Filters

Top right

Today

Yesterday

This Week

Last Week

This Month

Last Month

Custom Date Range

All charts and cards update instantly.

Daily Entry Screen

The daily entry screen should require minimal input.

Earnings

Gross Revenue

Cash Collected

Expenses

Fuel

Food

Repairs

Other

Each expense should have:

Amount

Optional invoice upload

Payment Method

○ Cash

○ Card

Cash Wallet Logic

The application should automatically maintain a Cash Wallet.

Example

Yesterday

Collected

100 zł

Wallet

100 zł

Today

Fuel

80 zł

Paid with

Cash

Wallet becomes

20 zł

If payment method is Card

Wallet stays unchanged.

The wallet updates automatically.

Fleet Commission

Fleet commission is configurable.

Default

7%

Calculation

Gross Revenue × Fleet Commission

Weekly Fleet Partner App Fee

The weekly app fee is configurable.

Default

50 zł

Rules

Charge once per calendar week.

Assign the fee automatically to the first working day.

A working day is any day with Gross Revenue greater than zero.

If the first working day changes because historical entries are edited, move the fee automatically.

Do not require manual entry.

Automatic Calculations

The application should calculate automatically:

Fleet Commission

Partner Payment

Total Expenses

Weekly App Fee

Cash Wallet

Profit

Weekly Totals

Monthly Totals

Reports

History Screen

Simple table.

Columns

Date

Gross Revenue

Cash Collected

Expenses

Profit

Partner Payment

Search

Sort

Edit

Delete

Reports

Allow exporting

PDF

Excel

CSV

Support

Weekly

Monthly

Custom Date Range

Settings

Fleet Settings

Fleet Commission %

Weekly App Fee

Currency

First Day of Week

Expense Categories

Allow adding

Parking

Car Wash

Insurance

Tolls

Custom Categories

Dashboard Settings

Dark Mode

Light Mode

Compact View

Default Date Range

Backup

Export Data

Import Data

Cloud Sync

Profile

Simple profile.

Driver Name

Email

Fleet Name

Vehicle

Vehicle Registration

Member Since

Theme

Logout

Mobile Design

Everything should be stacked vertically.

Cards become swipeable if necessary.

Charts should resize automatically.

Buttons should be thumb-friendly.

Large tap targets.

No horizontal scrolling.

The Daily Entry button should always be visible.

Desktop Design

Sidebar navigation.

Dashboard uses a responsive grid.

Large charts.

Resizable tables.

Maximum content width around 1400 px.

UX Principles

The user should never calculate anything manually.

The user should only enter:

Gross Revenue

Cash Collected

Expenses

Payment Method

Optional invoice images

Everything else should be computed automatically.

The application should feel more like a banking app than a spreadsheet.

Dashboard Overview

Top KPI Cards

1. Gross Revenue

Total earnings before any deductions.

Example:

4,820.50 zł

2. Expected Partner Payment ⭐

This is the amount the fleet partner should transfer.

Calculation

Gross Revenue

− Cash Collected

− Fleet Commission (7%)

Example:

Gross Revenue          4,820.50

Cash Collected           620.00

Fleet Commission         337.44

-------------------------------

Expected Payment       3,863.06 zł

This card should have a badge saying "Expected" since it's an estimate until the fleet settles.

3. Cash Wallet

This shows how much passenger cash the driver still has.

Example

185.50 zł

This updates automatically whenever cash is collected or spent.

4. Total Expenses

Includes

Fuel

Food

Repairs

Other

Weekly Fleet App Fee

5. Net Profit ⭐

Gross Revenue

− Fleet Commission

− Operating Expenses

=

Net Profit

This remains the primary business metric.

Date Selector Logic

This is where everything becomes powerful.

The entire application should use one global date selector.

The date selector controls every screen.

For example:

Today

Yesterday

This Week

Last Week

This Month

Last Month

Custom Range

or

01 Jul 2026 → 15 Jul 2026

When the user changes the date range, everything updates automatically.

That includes:

Dashboard Cards

Gross Revenue

Expected Partner Payment

Cash Wallet

Expenses

Net Profit

Charts

Revenue Trend

Profit Trend

Expense Breakdown

Revenue Breakdown

History

Only show records inside the selected range.

Reports

Generate reports only for the selected range.

Daily Entry

If the user selects

15 July

the Daily Entry screen should automatically load the entry for 15 July.

If they select

This Week

the Dashboard shows totals for the current week.

If they switch to

Last Month

every card and chart recalculates using only that month's data.

Weekly Fee Logic with Date Selector

Suppose the user selects

This Week

The dashboard should include:

One Fleet App Fee (50 zł), applied to the first working day of that week.

If the user selects

This Month

The dashboard should include all weekly fees that fall within that month.

Example:

WeekFirst Working DayFeeWeek 1Tuesday50 złWeek 2Monday50 złWeek 3Thursday50 złWeek 4Tuesday50 zł

Total Weekly Fees:

200 zł

Expected Partner Payment and Date Selector

The same rule applies.

If the user selects:

Today

Expected Partner Payment is calculated only from today's trips.

If they select:

This Week

It is the total expected payment for the week.

If they select:

Last Month

It is the total expected payment for last month.

There should never be a separate calculation mode—the selected date range always determines what data is included.

Design Philosophy

Every screen in the app should answer one question:

"For the period I've selected, how much did I earn, how much am I expecting from the fleet, how much have I spent, and how much did I actually keep?"

That makes the dashboard consistent, intuitive, and easy to understand, whether the user is viewing a single day, an entire week, or several months of driving history.

Fleet Settings Redesign

The application should no longer hardcode the fleet commission or weekly fee.

Instead, create a dedicated Fleet Settings section where the user can fully configure how their fleet calculates deductions.

Fleet Settings

Add a new page or section under Settings called Fleet Settings.

Fleet Name

Allow the user to enter their fleet name.

Example:

(example)

Weekly Fleet App Fee

Allow the user to enter the weekly platform/app fee.

Example:

50 PLN

Rules:

Applied automatically once per calendar week.

Assigned to the first working day of that week.

Included in all dashboard calculations.

Editable by the user.

Fleet Deductions

Instead of one commission percentage, allow the user to create multiple deductions.

Each deduction should contain:

Name

Examples

Fleet Commission

VAT

Administration Fee

Service Fee

Platform Fee

Type

Dropdown

Percentage (%)

Fixed Amount

Value

Examples

7%

8%

1%

20 PLN

Apply To

Dropdown

Gross Revenue

Net Revenue

Where:

Gross Revenue

Total earnings before any deductions.

Net Revenue

Revenue remaining after previous deductions have been applied.

This allows fleets that calculate percentages sequentially.

Calculation Order

Allow users to reorder deductions by drag-and-drop.

The order matters because some deductions are calculated after others.

Example

1. Fleet Commission

2. VAT

3. Administration Fee

4. Fixed Platform Fee

The calculation engine should process deductions from top to bottom.

Example 1

Fleet charges

7%

Applied to Gross Revenue

Calculation

Gross Revenue

×

7%

Example 2

(example)

8% VAT

1% Fleet Fee

Both applied to Gross Revenue.

Gross Revenue

× 8%

Gross Revenue

× 1%

Example 3

Some fleets calculate like this

7% Commission

Then

2% Service Fee on Net Revenue

Calculation

Gross Revenue

↓

7%

↓

Net Revenue

↓

2%

The application must support this workflow.

Dashboard Integration

Every configured deduction should automatically appear in the calculations.

Example

Gross Revenue

5,000 PLN

Fleet Commission

-350 PLN

VAT

-400 PLN

Administration Fee

-50 PLN

Weekly App Fee

-50 PLN

Total Fleet Deductions

800 PLN

Expected Partner Payment should automatically become

Gross Revenue

− Cash Collected

− Total Fleet Deductions

without requiring any manual calculation.

Date Range Logic

All deductions should respect the selected date range.

Examples

Today

Only today's deductions.

This Week

All deductions for the selected week.

Include one Weekly App Fee if applicable.

This Month

Include every deduction and every Weekly App Fee that falls within the selected month.

Custom Date Range

Recalculate all commissions, deductions, and fees using only the selected dates.

User Experience

The user should never edit formulas.

They only define the fleet's deduction rules once in Settings.

After that, the application automatically calculates:

Fleet deductions

Weekly app fee

Expected Partner Payment

Total Expenses

Net Profit

Dashboard summaries

Reports

based on the configured rules.

One additional improvement

I would also add an "Effective Deduction Rate" on the Fleet Settings page.

For example, if the user configures:

Fleet Commission: 7% (Gross)

VAT: 8% (Gross)

Weekly Fee: 50 PLN

the settings page can show:

Current Fleet Configuration

Fleet: (example)

Recurring Deductions

• Fleet Commission: 7% of Gross

• VAT: 8% of Gross

• Weekly App Fee: 50 PLN

These settings are used automatically throughout the app.

This gives users a quick way to verify that their fleet configuration is correct without inspecting each calculation. It also makes the app flexible enough to support nearly any fleet's charging structure.




THat is the prompt.... but this is the prompt you should work on now.





For the fuel option, I need to add cash+ card so this works when the user used the uber cash and then paid more for the gas, for instance user buys gas of 60 but has cash of 40 so the 20 balance goes to card and the cash balance goes to zero, also for the custom date instead of having two calendar, I need it to be one calendar where user just picks one date and then  the clicks again, to pick just a date the user needs to click twice on the date or click once and clicks outside of the calendar. and this automatically updates the data and table.
in the add entry, remove the save button as I want it to be savinf automatically as user adds and edits

Now we have to add landing page and also an admin page where riders profile can be seen and their dashboard only by clicking the rider


RideTracks Landing Page

Hero Section

Headline

Track Every Ride. Know Every Złoty.

Subtitle

RideTracks helps taxi and rideshare drivers track earnings, expenses, fleet deductions, and real profit—all in one place.

Whether you drive for Uber, Bolt, Free Now, or a local taxi company, RideTracks keeps your business organized.

CTA Buttons

🟢 Get Started Free

⚪ Watch Demo

On the right side:

Show a modern dashboard mockup with both desktop and mobile views.

Trusted Platforms

Built for every professional driver

Display clean platform cards (avoid using official logos unless you have permission).

Uber

Bolt

Free Now

Taxi

Fleet Drivers

Owner Drivers

Below it:

RideTracks works with any taxi or rideshare platform because commissions, deductions, and expenses are fully customizable.

Features

Everything you need to manage your driving business

💰 Track Earnings

Log your daily revenue in seconds.

🚖 Fleet Payments

Automatically calculate what your fleet partner should pay you.

⛽ Expenses

Track fuel, food, repairs, parking, tolls and every business expense.

📈 Profit

Know exactly how much money you actually made after deductions.

💵 Cash Wallet

Track passenger cash and always know how much cash you still have.

📊 Reports

Weekly, monthly and custom reports ready whenever you need them.

How It Works

Step 1

Record today's earnings.

Gross Revenue

Cash Collected

Step 2

Add expenses.

Fuel

Food

Parking

Repairs

Other

Step 3

RideTracks calculates everything automatically.

Fleet deductions

Expected payment

Weekly fees

Profit

Cash Wallet

Dashboard Preview

Large screenshot.

Desktop and mobile.

Caption

One dashboard for your entire driving business.

Why Drivers Choose RideTracks

Three large cards.

Save Time

Stop using spreadsheets.

Stay Organized

Everything in one place.

Know Your Profit

See your actual earnings—not just revenue.

Fleet Support

Flexible enough for every fleet

RideTracks lets you configure:

Multiple commission rates

Percentage or fixed deductions

Gross or net calculations

Weekly platform fees

VAT deductions

Custom deduction rules

No matter how your fleet calculates payments, RideTracks can match it.

Perfect For

Display six cards.

🚖 Uber Drivers

🚖 Bolt Drivers

🚖 Free Now Drivers

🚖 Licensed Taxi Drivers

🚖 Fleet Drivers

🚖 Owner Operators

Testimonials

Leave placeholders for future customer reviews.

FAQ

Does RideTracks only work for Uber?

No.

It works with Uber, Bolt, Free Now, traditional taxi companies, and independent drivers.

Can I configure my fleet deductions?

Yes.

You can configure multiple commissions, VAT, weekly fees, and custom deduction rules.

Can I track cash trips?

Yes.

RideTracks includes a built-in cash wallet.

Can I upload fuel receipts?

Yes.

You can upload receipts and invoices for expenses.

Final CTA

Stop guessing your earnings.

Start tracking every ride, every expense, and every payout in one place.

🟢 Create Your Free Account

Footer

Features

Pricing

FAQ

Privacy Policy

Terms

Contact

Design Style

Think:

Stripe

Revolut

Linear

Notion

Uber Driver App

Very clean.

Lots of white space.

Rounded cards.

Large typography.

Fast loading.

Professional.

No unnecessary animations.

One branding suggestion

I would avoid making the homepage about fleets because not every taxi driver works with one. Instead, position RideTracks as a business management platform for professional drivers.

A concise value proposition could be:

RideTracks is the all-in-one business dashboard for taxi and rideshare drivers. Track earnings, expenses, fleet deductions, cash payments, and profit with complete clarity.

That positioning is broad enough to support future features like tax summaries, vehicle maintenance, mileage tracking, and multi-platform earnings without needing to change the brand message later.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ridertracks.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3927999e-9f48-4b34-8729-62669443321f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
