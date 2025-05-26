// Block template for consistent Christus Health theming across workflow blocks
export const blockTemplate = (theme) => ({
  block: {
    borderRadius: 3,
    boxShadow: 6,
    padding: theme.spacing(2),
    bgcolor: theme.palette.background.paper,
    border: `1.5px solid ${theme.palette.primary.main}`,
    mb: 2,
  },
  button: {
    variant: 'contained',
    color: 'primary',
    sx: {
      opacity: 1,
      borderRadius: 2,
      fontWeight: 600,
      textTransform: 'none',
      px: 3,
      py: 1.25,
      boxShadow: 2,
      fontFamily: 'Montserrat, Barlow, Arial, sans-serif',
      '&:hover': {
        opacity: 1,
      },
      '& .MuiButton-label': {
        opacity: 1,
      },
    },
  },
  card: {
    borderRadius: 3,
    boxShadow: 4,
    bgcolor: theme.palette.background.paper,
    border: `1.5px solid ${theme.palette.primary.main}`,
    p: 2,
  },
  accordion: {
    borderRadius: 3,
    boxShadow: 4,
    border: `1.5px solid ${theme.palette.primary.main}`,
    bgcolor: theme.palette.background.paper,
  },
  // Add more shared styles as needed
}); 