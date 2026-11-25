outputs "ecr_repo_url"{
    description = "ECR URL"
    value = aws_ecr_repository.main.repository_url
}  