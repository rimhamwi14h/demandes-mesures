
## 1. Le besoin
We have our client Julien who is someone that performs measurements for research teams and some companies, he is getting requests through different ways:
Emails, Teams... and Julien takes them,records them on a whiteboard, performs the measurement and sends results by email
The second problem is that all of them arrive and telling him that they are top priorities « urgentes ».
So as the begining, we found that our client has 2 problems:
He does not know which request he has to start first
He can not track the state of the requests he is doing
he said that in the first message : "Je ne sais jamais par quoi commencer, ni où j'en suis."

That is why we started asking Julien questions in the discussion in order to transform this big problem into precise requirements
we will now do a summary of what we asked Julien and what he told us in order to understand what he wanted
**who submit the requests?**: the requesters(Not Julien), that told us that we need an interface for the requesters in order to request and an interface for Julien in order to follow them and decide priority and publish results
**what infos needed to process the request?**:the samples to measure, deadline and the type of measurement they want
**Priorities:** Julien decides the order
**Processing stages**: Recieved, started, completed; a request can become impossible if damaged or maybe too small, and Julien must tell the requester and explain for him why?
**Who performs the measurements?**:Julien alone manages these measurements
**Visibility**:a PhD student or a researcher can see the request he made, a team manager can see his own requests and all the requests created by the members of the team, but a company can not see what other companies requested, only Julien can see all the requests made.
**Editing and cancellation**: the requesters can modify or cancel their request but only BEFORE Julien starts processing the request
**Results**:Julien can uploads files or tables or images with a comment on the application
**Accounts**: Researchers and students create their own accounts using their school email address and when they are registering, they pick which of the six research teams they are, Julien chooses one person from each team and assigns him as a manager of the team , Julien also make accounts for company contacts, since he already knows the four partner companies
**Completion**: a request become complete when Julien publishes its result
**Unmeasurable samples**: The old request recorded as “not measurable” and the requester has to create a new request for the new replacement sample
all of this discussion was made with Julien here: https://github.com/gaetanmaisse/ismin-web-2026-tps/discussions/18

So as a summary, our first idea, before the discussion, was to build an Application to centralize requests, and track the progress of each request
after this discussion, we understood that we need to build a request management system complete based on three main features.
## 2. Les trois fonctionnalités
### Fonctionnalité 1:Submitting and managing a measurement request
the goal of this one is to solve the problem of contacting Julien, by this feature, the requesters can directly create requests themselves instead of contacting Julien.
also, when creating a request, the requester must provide all the infos needed by Julien
Now after submission, the requester can: view the request and modify its information and cancel it.
so mainly this feature solved the problem of copying messages onto whiteboard and now every request contains the necessary information from the beginning

### Fonctionnalité 2: organizing and processing measurement requests
This feature is mainly used by Julien himself .
It gives him a complete list of waiting requests and all the informations needed in order to decide what he has to process next.
the system can class the orders in a primary way by giving priority for companies because they have contrats and deadlines and after that the priority would be according to deadlines and Julien can also change the order of requests manually because he knows the measurements, and also an important feature is that he can change the status of the request from Pending to In progress or Not measurable if this is the case but he has to say why not measurable 
this feature solved the problem of "ni où j'en suis." he talked about at the beggining.

### Fonctionnalité 3 : tracking requests and retrieving results
unlike feature 2, this is used mainly by requesters and Julien.
The requesters use it to follow the request progress and retrieve published results and Julien use this one in order to upload the result and after it he maybe add a short comment about his work; at the same time, team managers can follow the requests that belong to their team
When Julien finishes the work, he can publish the result and the task would be marked as complete, so the requester can directly install the result and there is no need to wait for Julien to send it for him as an email again
this feature stopped the need of an email back from Julien and that is why we chose it
and we choosed it also because sending results back can be lost 
all of these problems are now fixed

### Ce que nous avons écarté
In this project we can see a complete system but without **Invoicing and payment management**
We did not add these features in the system, even if they can makes our system a better system and can save the time for the users and for Julien
payment management feature will require from us an integration with an external payment provider
and this also require from us hard work to handle failures and all the duplicate transactions
and the most important thing that it would introduce another business domain
and at the end, Julien did not mention that payment or Invoicing are one of the problems that he needs from us solving it 

## 3. Decision log
### Decision 1 - Combine default priorities with manual ordering
- **Choice:** Provide a default order that prioritize company requests, followed with the requested dates, while allowing Julien to change the order manually.
- **Alternative not implemented:** A fixed automatic order that the technician cannot adjust.
- **Why:** Julien ex'plained that companies have contractual deadlines, but he also needs to organize measurments according to his knowledge of the equipement.
- **Evidence:** [Commit 00af1ef — Prioritization, ordering and processing](https://github.com/rimhamwi14h/demandes-mesures/commit/00af1ef) and [the client discussion](https://github.com/gaetanmaisse/ismin-web-2026-tps/discussions/18).

### Decision 2 - Enforce access permission in the backend
- **Choice:** Check permissions in the API and filter requets according to the authenticate user, their role and their team.
- **Alternative not implemented:** Relying only on hiding unauthorized buttons or pages in the React interface.
- **Why:** A user can send HTTP request without using the interface. Hiding a button would not prevent unauthorized access. The backend cheks which requests the user can read or modify.A team manager can consult their teams requests but can not modify another members request. Company contacts can access only their own requests. 
- **Evidence:** [Commit d28b5c5 — Request management and access filtering](https://github.com/rimhamwi14h/demandes-mesures/commit/d28b5c5), particularly `api/src/requests/requests.service.ts`.

### Decision 3 - Keep non measurable requests in the history
- **Choice:** Preserve a non measurable requets with a mandatory explanation. A replacement sample must be submitted through a new request.
- **Alternative not implemented:** Deleting the unsuccessful request or replacing its samples within the same request.
- **Why:** Julien asked to keep a record of unsuccessful measurments. Preserving the original request keeps the samples and the explanation together. Creating a separate request for the replacement avoid losing information about the previous attempt.
- **Evidence:** [Commit 00af1ef — Processing and non-measurable requests](https://github.com/rimhamwi14h/demandes-mesures/commit/00af1ef) and [the client’s clarification about replacement samples](https://github.com/gaetanmaisse/ismin-web-2026-tps/discussions/18).

### Decision 4 - Link completion to successful result publication
- **Choice:** Mark a request as completed when Julien successfuly publishes it result files and comment.
- **Alternative not implemented:** A separate completion action that could mark the request as finish before its result is available.
- **Why:** Juliens problem was that he sometimes did the measurment but the result never reached the requester.Now a request becomes complet only when its result is published in the application, so a completed request always has a result available. Julien confirmed that he does not need to wait for the requester to download it
- **Evidence:** `api/src/results/results.service.ts`, [commit 7ac7795 — Result publication and downloading in React](https://github.com/rimhamwi14h/demandes-mesures/commit/7ac7795), and [the client discussion](https://github.com/gaetanmaisse/ismin-web-2026-tps/discussions/18).

### Decision 5 - Prepare the database automatically during Docker startup
- **Choice:** Apply existing Prisma migration and run the initialization script before starting the API through Docker Compose.
- **Alternative not implemented:** Requiring additional manual commands to create the database structure,teams and technician account after starting the containers.
- **Why:** The application must start from a fresh clone using docker compose up.Automatic preparation makes the database structure, six teams and Juliens account available without depending on our development database. The initialization script can be executed again without duplicating these initial records.
- **Evidence:** [Commit 8c75a70 — Complete Docker Compose startup](https://github.com/rimhamwi14h/demandes-mesures/commit/8c75a70), particularly `compose.yaml`, together with `api/prisma/seed.ts`.

## 4. An AI proposal we revised 
### Initial proposal for testing result publication
- **Assistants proposal:** the assistant generated tests that selected a file using user.upload() and submited the result form by clicking the publication button using user.click()'
- **Why we did not retain it unchanged:** Both tests failed in our test enviroment.The selected filename appeared in the interface, but the mocked API was not called.In the error-handling test, the expected error message did not appear either.These observations susggested that the form was not reaching the publication handler.An interaction with native file-input validation was suspected but we did not establish the exact cause.
- **Decision taken instead:** Following the diagnosis and another suggestion from the assistant, we checked that a file was selected and triggered the forms submit event directly usingfireEvent.submit(form).The tests then checked the publication handler: the request URL, the HTTP method, the files and comment sent throutgh FromData, and the handling of an API error. Because direct submission bypasses the real button submission path, we also check publication and downloading mannually in the browser.
-  **Evidence:** `web/src/components/ResultUpload.spec.tsx`, included in [commit 7ac7795](https://github.com/rimhamwi14h/demandes-mesures/commit/7ac7795). 
