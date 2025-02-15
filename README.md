**Infra Flow Overview**

1. **Repository Integration:**  
   The user connects their GitHub repository to the system.

2. **Commit Trigger:**  
   Every time a new commit is pushed, GitHub's webhook notifies the deplit-backend, triggering a new build job.

3. **Worker Execution:**  
   A worker is spawned to handle the build process:

   - It builds the site and uploads the resulting artifacts to Azure Blob Storage.
   - It streams real-time logs back to the backend.
   - It updates the build job's status within the backend.

4. **Frontend Interaction:**  
   The frontend continuously streams these logs from the backend and displays the current build job status to the user.
